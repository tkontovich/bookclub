// Turns the club's current book + meeting settings into one Google Calendar
// event, and records what happened in calendar_invites.
//
// Google failures are recorded rather than thrown: a save that can't reach
// Google must still keep the meeting date, with a retry offered afterwards.
import { getSupabase } from "./supabase";
import { getClubSettings, getInvitableMembers } from "./data";
import {
  GoogleAuthError,
  accessTokenFor,
  deleteEvent,
  forgetAccessToken,
  getPrimaryCalendar,
  insertEvent,
  loadCredentials,
  patchEvent,
  type EventPayload,
} from "./google";
import type { Book } from "./types";

export type InviteOutcome =
  | { status: "sent"; recipients: number; meetUrl: string | null }
  | { status: "skipped"; reason: "not_connected" | "no_date" | "no_recipients" }
  | { status: "failed"; message: string };

/**
 * Wall-clock offset for a zone on a given date, e.g. "-07:00". Google accepts
 * a naive dateTime alongside timeZone, but sending a real RFC3339 offset
 * removes any ambiguity about which instant is meant.
 */
function zoneOffset(date: string, time: string, timeZone: string): string {
  const approximate = new Date(`${date}T${time}Z`);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(approximate)
    .find((part) => part.type === "timeZoneName")?.value;
  const offset = (name ?? "GMT+00:00").replace("GMT", "");
  return offset === "" ? "+00:00" : offset;
}

/** "19:00:00" + 120 minutes -> "21:00:00", rolling past midnight if needed. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

function normalizeTime(time: string): string {
  const [h = "0", m = "0"] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`;
}

async function recordInvite(fields: {
  book_id: string;
  google_event_id?: string | null;
  meet_url?: string | null;
  status: "sent" | "failed";
  error?: string | null;
  recipient_count?: number;
}) {
  const { error } = await getSupabase()
    .from("calendar_invites")
    .upsert(
      {
        ...fields,
        sent_at: fields.status === "sent" ? new Date().toISOString() : null,
      },
      { onConflict: "book_id" },
    );
  if (error) throw new Error(error.message);
}

async function getBook(bookId: string): Promise<Book | null> {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("id", bookId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function existingInvite(bookId: string) {
  const { data, error } = await getSupabase()
    .from("calendar_invites")
    .select("*")
    .eq("book_id", bookId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Creates the meeting invite for a book, or updates the one already sent.
 * Google emails every attendee either way, so a date change reaches people
 * as an update to the same event rather than a second invitation.
 */
export async function syncInvite(bookId: string): Promise<InviteOutcome> {
  const credentials = await loadCredentials();
  if (!credentials) return { status: "skipped", reason: "not_connected" };

  const [book, settings, members] = await Promise.all([
    getBook(bookId),
    getClubSettings(),
    getInvitableMembers(),
  ]);
  if (!book) throw new Error("That book no longer exists.");
  if (!settings.next_meeting_date) return { status: "skipped", reason: "no_date" };
  if (members.length === 0) return { status: "skipped", reason: "no_recipients" };

  const date = settings.next_meeting_date;
  const timeZone = settings.meeting_timezone;
  const startTime = normalizeTime(settings.meeting_start_time);
  const endTime = addMinutes(startTime, settings.meeting_duration_minutes);

  const payload: EventPayload = {
    summary: `CLIT Club: ${book.title}`,
    description: book.author
      ? `We're discussing ${book.title} by ${book.author}.`
      : `We're discussing ${book.title}.`,
    start: {
      dateTime: `${date}T${startTime}${zoneOffset(date, startTime, timeZone)}`,
      timeZone,
    },
    end: {
      dateTime: `${date}T${endTime}${zoneOffset(date, endTime, timeZone)}`,
      timeZone,
    },
    attendees: members.map((m) => ({ email: m.email! })),
  };

  const previous = await existingInvite(bookId);

  try {
    const accessToken = await accessTokenFor(credentials.refresh_token);

    let result;
    if (previous?.google_event_id) {
      result = await patchEvent(
        accessToken,
        credentials.calendar_id,
        previous.google_event_id,
        payload,
      );
    } else {
      // Only ask for a Meet link if this calendar can actually make one.
      const calendar = await getPrimaryCalendar(accessToken);
      const canMeet = calendar.allowedConferenceSolutionTypes.includes("hangoutsMeet");
      result = await insertEvent(accessToken, credentials.calendar_id, payload, canMeet);
    }

    await recordInvite({
      book_id: bookId,
      google_event_id: result.id,
      meet_url: result.meetUrl,
      status: "sent",
      error: null,
      recipient_count: members.length,
    });
    return { status: "sent", recipients: members.length, meetUrl: result.meetUrl };
  } catch (e) {
    if (e instanceof GoogleAuthError) forgetAccessToken(credentials.refresh_token);
    const message =
      e instanceof GoogleAuthError
        ? "Google connection expired. Reconnect in settings."
        : e instanceof Error
          ? e.message
          : "Couldn't reach Google.";
    await recordInvite({
      book_id: bookId,
      google_event_id: previous?.google_event_id ?? null,
      meet_url: previous?.meet_url ?? null,
      status: "failed",
      error: message,
      recipient_count: members.length,
    });
    return { status: "failed", message };
  }
}

/** Updates an invite only if one was already sent for this book. */
export async function syncInviteIfSent(bookId: string): Promise<InviteOutcome | null> {
  const previous = await existingInvite(bookId);
  if (!previous?.google_event_id) return null;
  return syncInvite(bookId);
}

// --- Test invites -----------------------------------------------------------
//
// A throwaway event for checking that invitations actually arrive, before the
// real one goes to the whole club. Deliberately kept out of calendar_invites:
// the book's own invite state must not be touched by a test.

export type TestEventResult = {
  eventId: string;
  meetUrl: string | null;
  recipients: number;
};

export async function sendTestEvent(options: {
  summary: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  emails: string[];
}): Promise<TestEventResult> {
  const credentials = await loadCredentials();
  if (!credentials) throw new Error("Connect Google Calendar first.");

  const settings = await getClubSettings();
  const timeZone = settings.meeting_timezone;
  const startTime = normalizeTime(options.startTime);
  const endTime = addMinutes(startTime, options.durationMinutes);

  const payload: EventPayload = {
    summary: options.summary,
    description: "Test invitation from the CLIT Club site. Safe to ignore or decline.",
    start: {
      dateTime: `${options.date}T${startTime}${zoneOffset(options.date, startTime, timeZone)}`,
      timeZone,
    },
    end: {
      dateTime: `${options.date}T${endTime}${zoneOffset(options.date, endTime, timeZone)}`,
      timeZone,
    },
    attendees: options.emails.map((email) => ({ email })),
  };

  try {
    const accessToken = await accessTokenFor(credentials.refresh_token);
    const calendar = await getPrimaryCalendar(accessToken);
    const canMeet = calendar.allowedConferenceSolutionTypes.includes("hangoutsMeet");
    const result = await insertEvent(accessToken, credentials.calendar_id, payload, canMeet);
    return { eventId: result.id, meetUrl: result.meetUrl, recipients: options.emails.length };
  } catch (e) {
    if (e instanceof GoogleAuthError) forgetAccessToken(credentials.refresh_token);
    throw new Error(e instanceof Error ? e.message : "Couldn't reach Google.");
  }
}

/** Removes a test event; Google mails the cancellation so calendars clear. */
export async function deleteTestEvent(eventId: string): Promise<void> {
  const credentials = await loadCredentials();
  if (!credentials) throw new Error("Connect Google Calendar first.");
  const accessToken = await accessTokenFor(credentials.refresh_token);
  await deleteEvent(accessToken, credentials.calendar_id, eventId);
}
