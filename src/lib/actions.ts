"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "./supabase";
import { getActiveMembers, getAllMembers, getClubSettings, getCurrentBook } from "./data";
import { searchForBooks } from "./book-search";
import { clearCredentials, forgetAccessToken, loadCredentials, revokeToken } from "./google";
import {
  deleteTestEvent,
  sendTestEvent,
  syncInvite,
  syncInviteIfSent,
  type TestEventResult,
} from "./invites";
import { SESSION_COOKIE_NAME, isUnlocked } from "./session";
import { todayIsoDate } from "./util";
import type { ActionResult, BookSearchResult, Member } from "./types";

/**
 * Every write goes through here. Server actions are POST endpoints that
 * anyone can call directly, so hiding the edit UI is not a boundary -
 * this check is. Must be the first line of any mutating action.
 */
async function requireUnlocked(): Promise<void> {
  if (!(await isUnlocked())) {
    throw new Error("Editing is locked. Switch edit mode on first.");
  }
}

/** Turns edit mode off. Clearing the cookie re-renders the current page. */
export async function lockSite(formData: FormData): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/", "layout");

  // Settings is edit-only, so re-rendering it would just bounce to the
  // password screen. Send people home instead.
  const from = formData.get("from");
  if (typeof from === "string" && from.startsWith("/settings")) redirect("/");
}

function nonEmpty(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validEmail(value: string | null): string | null {
  if (!value) return null;
  // Deliberately loose: Google does the real validation, and a wrong-looking
  // address should fail loudly there rather than be silently dropped here.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`"${value}" doesn't look like an email address.`);
  }
  return value;
}

type ScoreRow = { book_id: string; member_id: string; absent: boolean; score: number | null };

function buildScoreRows(formData: FormData, members: Member[], bookId: string): ScoreRow[] {
  return members.map((member) => {
    const absent = formData.get(`absent_${member.id}`) === "on";
    const scoreRaw = formData.get(`score_${member.id}`);
    let score: number | null = null;
    if (!absent && typeof scoreRaw === "string" && scoreRaw.trim() !== "") {
      const parsed = Math.round(Number(scoreRaw) * 10) / 10;
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        throw new Error(`${member.name}'s score must be between 0 and 10.`);
      }
      score = parsed;
    }
    return { book_id: bookId, member_id: member.id, absent, score };
  });
}

// --- Members ----------------------------------------------------------------

export async function addMember(formData: FormData): Promise<ActionResult> {
  try {
    await requireUnlocked();
    const name = nonEmpty(formData, "name");
    if (!name) return { ok: false, message: "Name is required." };
    const email = validEmail(nonEmpty(formData, "email"));

    const { error } = await getSupabase().from("members").insert({ name, email });
    if (error) {
      if (error.code === "23505") return { ok: false, message: `"${name}" is already a member.` };
      return { ok: false, message: error.message };
    }
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (e) {
    console.error("addMember failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not add that member." };
  }
}

/**
 * Member changes don't touch the calendar. Google emails every attendee on
 * any event change, so syncing here would mail the whole club each time an
 * address is corrected - resending is an explicit choice instead.
 */
export async function updateMember(formData: FormData): Promise<ActionResult> {
  try {
    await requireUnlocked();
    const memberId = nonEmpty(formData, "memberId");
    if (!memberId) return { ok: false, message: "Missing member." };
    const name = nonEmpty(formData, "name");
    if (!name) return { ok: false, message: "Name is required." };
    const email = validEmail(nonEmpty(formData, "email"));

    const { error } = await getSupabase()
      .from("members")
      .update({ name, email })
      .eq("id", memberId);
    if (error) {
      if (error.code === "23505") return { ok: false, message: `"${name}" is already a member.` };
      return { ok: false, message: error.message };
    }
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (e) {
    console.error("updateMember failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not save that member." };
  }
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  try {
    await requireUnlocked();
    const memberId = nonEmpty(formData, "memberId");
    if (!memberId) return { ok: false, message: "Missing member." };

    const { error } = await getSupabase()
      .from("members")
      .update({ active: false })
      .eq("id", memberId);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (e) {
    console.error("removeMember failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not remove that member." };
  }
}

// --- Google calendar --------------------------------------------------------

/** Drops the stored token and tells Google to forget the grant too. */
export async function disconnectGoogle(): Promise<void> {
  await requireUnlocked();
  const credentials = await loadCredentials();
  if (credentials) {
    forgetAccessToken(credentials.refresh_token);
    await revokeToken(credentials.refresh_token);
    await clearCredentials();
  }
  revalidatePath("/settings");
  revalidatePath("/");
}

const ALLOWED_DURATIONS = [60, 90, 120, 150, 180];

export async function saveMeetingSettings(formData: FormData): Promise<ActionResult> {
  try {
    await requireUnlocked();
    const startTime = nonEmpty(formData, "startTime");
    if (!startTime || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
      return { ok: false, message: "Pick a start time." };
    }
    const duration = Number(formData.get("durationMinutes"));
    if (!ALLOWED_DURATIONS.includes(duration)) {
      return { ok: false, message: "Pick a meeting length." };
    }

    const { error } = await getSupabase()
      .from("club_settings")
      .update({
        meeting_start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        meeting_duration_minutes: duration,
      })
      .eq("id", true);
    if (error) return { ok: false, message: error.message };

    // An invite that's already out should move to the new time.
    const currentBook = await getCurrentBook();
    if (currentBook) await syncInviteIfSent(currentBook.id);

    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (e) {
    console.error("saveMeetingSettings failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not save the time." };
  }
}

/** Sends the invite, or re-sends it to everyone on the current list. */
export async function sendInvite(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  // The outcome is recorded on calendar_invites, which is what the UI reads,
  // so a Google failure surfaces as a status rather than an error page.
  await syncInvite(bookId);

  revalidatePath("/settings");
  revalidatePath("/");
}

const TEST_DURATION_MINUTES = 30;

/**
 * Sends a throwaway invitation to a chosen few, to confirm invites actually
 * arrive before the real one goes out. Recipients arrive as member ids and
 * their addresses are looked up here, so this can't be used to mail an
 * arbitrary address.
 */
export async function sendTestInvite(
  formData: FormData,
): Promise<ActionResult<TestEventResult>> {
  try {
    await requireUnlocked();

    const summary = nonEmpty(formData, "summary") ?? "CLIT Club test invite";
    const date = nonEmpty(formData, "date");
    if (!date) return { ok: false, message: "Pick a date for the test." };
    const startTime = nonEmpty(formData, "startTime");
    if (!startTime || !/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
      return { ok: false, message: "Pick a start time." };
    }

    const selected = new Set(
      formData.getAll("recipients").filter((v): v is string => typeof v === "string"),
    );
    const members = await getAllMembers();
    const emails = members
      .filter((m) => selected.has(m.id) && m.active && m.email && m.email.trim() !== "")
      .map((m) => m.email!);
    if (emails.length === 0) {
      return { ok: false, message: "Choose at least one person with an email to test with." };
    }

    const result = await sendTestEvent({
      summary,
      date,
      startTime,
      durationMinutes: TEST_DURATION_MINUTES,
      emails,
    });
    return { ok: true, data: result };
  } catch (e) {
    // Also logged server-side: production strips the message on its way out.
    console.error("sendTestInvite failed:", e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Couldn't send the test invite.",
    };
  }
}

export async function cancelTestInvite(eventId: string): Promise<ActionResult> {
  try {
    await requireUnlocked();
    if (!eventId) return { ok: false, message: "Missing test event." };
    await deleteTestEvent(eventId);
    return { ok: true, data: null };
  } catch (e) {
    console.error("cancelTestInvite failed:", e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Couldn't cancel the test event.",
    };
  }
}

// --- Current book -----------------------------------------------------------

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  await requireUnlocked();
  return searchForBooks(query);
}

export async function startCurrentBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const currentBook = await getCurrentBook();
  if (currentBook) {
    throw new Error("Lock the current book before starting a new one.");
  }

  const title = nonEmpty(formData, "title");
  if (!title) throw new Error("Title is required.");

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) throw new Error("Choose who picked this book.");

  const { data: book, error } = await getSupabase()
    .from("books")
    .insert({
      title,
      author: nonEmpty(formData, "author"),
      cover_url: nonEmpty(formData, "coverUrl"),
      google_books_id: nonEmpty(formData, "googleBooksId"),
      picker_id: pickerId,
      status: "current",
    })
    .select("id")
    .single();
  if (error || !book) throw new Error(error?.message ?? "Could not start that book.");

  // The meeting date is set alongside the book rather than in settings; it
  // later seeds the "discussed on" date when the book gets archived.
  const { error: settingsError } = await getSupabase()
    .from("club_settings")
    .update({ next_meeting_date: nonEmpty(formData, "nextMeetingDate") })
    .eq("id", true);
  if (settingsError) throw new Error(settingsError.message);

  // Failures are recorded against the book and retried from settings; the
  // book and its date are already saved either way.
  if (formData.get("sendInvite") === "on") await syncInvite(book.id);

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function saveScores(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  const members = await getActiveMembers();
  const rows = buildScoreRows(formData, members, bookId).filter(
    (row) => row.absent || row.score !== null,
  );

  if (rows.length > 0) {
    const { error } = await getSupabase()
      .from("scores")
      .upsert(rows, { onConflict: "book_id,member_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

/**
 * Archives the book once it's been discussed. The calendar event is left
 * alone: that meeting has already happened, and deleting it would mail
 * everyone a cancellation for something they attended.
 */
export async function lockBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  // The meeting date set when the book started is the date it was
  // discussed; it stays correctable from Settings afterwards.
  const settings = await getClubSettings();
  const dateDiscussed = settings.next_meeting_date ?? todayIsoDate();

  const { error } = await getSupabase()
    .from("books")
    .update({ status: "past", date_discussed: dateDiscussed })
    .eq("id", bookId)
    .eq("status", "current");
  if (error) throw new Error(error.message);

  // That meeting has now happened, so the date no longer applies until
  // the next book is started.
  const { error: settingsError } = await getSupabase()
    .from("club_settings")
    .update({ next_meeting_date: null })
    .eq("id", true);
  if (settingsError) throw new Error(settingsError.message);

  revalidatePath("/");
  revalidatePath("/settings");
}

// --- Past books (backfilling history) ---------------------------------------

export async function addPastBook(formData: FormData): Promise<ActionResult> {
  try {
    return await addPastBookInner(formData);
  } catch (e) {
    console.error("addPastBook failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not add that book." };
  }
}

async function addPastBookInner(formData: FormData): Promise<ActionResult> {
  await requireUnlocked();
  const title = nonEmpty(formData, "title");
  if (!title) return { ok: false, message: "Title is required." };

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) return { ok: false, message: "Choose who picked this book." };

  const dateDiscussed = nonEmpty(formData, "bookDate");
  if (!dateDiscussed) return { ok: false, message: "Discussion date is required." };

  const { data: book, error: bookError } = await getSupabase()
    .from("books")
    .insert({
      title,
      author: nonEmpty(formData, "author"),
      cover_url: nonEmpty(formData, "coverUrl"),
      google_books_id: nonEmpty(formData, "googleBooksId"),
      picker_id: pickerId,
      status: "past",
      date_discussed: dateDiscussed,
    })
    .select("id")
    .single();
  if (bookError || !book) {
    return { ok: false, message: bookError?.message ?? "Could not add the book." };
  }

  const members = await getAllMembers();
  const rows = buildScoreRows(formData, members, book.id).filter(
    (row) => row.absent || row.score !== null,
  );

  if (rows.length > 0) {
    const { error: scoresError } = await getSupabase()
      .from("scores")
      .upsert(rows, { onConflict: "book_id,member_id" });
    if (scoresError) return { ok: false, message: scoresError.message };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true, data: null };
}

/**
 * Edits any book from Settings. For an archived book the date is when it
 * was discussed; for the book being read now it's the next meeting date,
 * which lives on club_settings rather than the book row.
 */
export async function updateBook(formData: FormData): Promise<ActionResult> {
  try {
    return await updateBookInner(formData);
  } catch (e) {
    console.error("updateBook failed:", e);
    return { ok: false, message: e instanceof Error ? e.message : "Could not save that book." };
  }
}

async function updateBookInner(formData: FormData): Promise<ActionResult> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) return { ok: false, message: "Missing book." };

  const title = nonEmpty(formData, "title");
  if (!title) return { ok: false, message: "Title is required." };

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) return { ok: false, message: "Choose who picked this book." };

  const isCurrent = formData.get("status") === "current";
  const bookDate = nonEmpty(formData, "bookDate");
  if (!isCurrent && !bookDate) return { ok: false, message: "Discussion date is required." };

  const { error } = await getSupabase()
    .from("books")
    .update({
      title,
      author: nonEmpty(formData, "author"),
      cover_url: nonEmpty(formData, "coverUrl"),
      google_books_id: nonEmpty(formData, "googleBooksId"),
      picker_id: pickerId,
      ...(isCurrent ? {} : { date_discussed: bookDate }),
    })
    .eq("id", bookId);
  if (error) return { ok: false, message: error.message };

  if (isCurrent) {
    const { error: settingsError } = await getSupabase()
      .from("club_settings")
      .update({ next_meeting_date: bookDate })
      .eq("id", true);
    if (settingsError) return { ok: false, message: settingsError.message };
  }

  // Replace the whole score set so cleared entries actually disappear
  // rather than lingering from the previous save.
  const members = await getAllMembers();
  const rows = buildScoreRows(formData, members, bookId).filter(
    (row) => row.absent || row.score !== null,
  );

  const { error: clearError } = await getSupabase()
    .from("scores")
    .delete()
    .eq("book_id", bookId);
  if (clearError) return { ok: false, message: clearError.message };

  if (rows.length > 0) {
    const { error: insertError } = await getSupabase().from("scores").insert(rows);
    if (insertError) return { ok: false, message: insertError.message };
  }

  // A date change on the current book moves the meeting, and Google mails
  // everyone the update - but only if an invite already went out.
  if (isCurrent) await syncInviteIfSent(bookId);

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true, data: null };
}
