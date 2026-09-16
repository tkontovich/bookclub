// Google Calendar, over plain fetch - the official client library pulls in a
// large dependency tree for the four calls this site makes.
//
// Only one permission is requested: calendar.events. That's enough to create
// and update the club's own meeting, and it deliberately can't read anything
// else on the calendar.
import { getSupabase } from "./supabase";
import type { GoogleCredentials } from "./types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const OAUTH_STATE_COOKIE = "google_oauth_state";

/** Thrown when the stored connection is gone or rejected by Google. */
export class GoogleAuthError extends Error {}

function clientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google isn't configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.",
    );
  }
  return { clientId, clientSecret };
}

/** Must match a redirect URI registered on the OAuth client, exactly. */
export function redirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/google/callback`;
}

export function buildConsentUrl(origin: string, state: string): string {
  const { clientId } = clientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPE,
    // offline + consent is what yields a refresh token, which is the only
    // way the site can send an invite later without anyone signed in.
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json.error_description || json.error || `HTTP ${res.status}`;
    // invalid_grant means the refresh token was revoked, expired, or the
    // Google account's access was removed - reconnecting is the only fix.
    if (json.error === "invalid_grant") {
      throw new GoogleAuthError(`Google connection is no longer valid (${detail}).`);
    }
    throw new Error(`Google token request failed: ${detail}`);
  }
  return json as TokenResponse;
}

export async function exchangeCodeForTokens(origin: string, code: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = clientCredentials();
  return postToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri(origin),
    grant_type: "authorization_code",
  });
}

// Access tokens last an hour. Keeping them in memory avoids a token round
// trip on every save; a cold start just refreshes again.
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function accessTokenFor(refreshToken: string): Promise<string> {
  const cached = accessTokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const { clientId, clientSecret } = clientCredentials();
  const tokens = await postToken({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  accessTokenCache.set(refreshToken, {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  return tokens.access_token;
}

export function forgetAccessToken(refreshToken: string) {
  accessTokenCache.delete(refreshToken);
}

// --- Stored connection ------------------------------------------------------

export async function loadCredentials(): Promise<GoogleCredentials | null> {
  const { data, error } = await getSupabase()
    .from("google_credentials")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveCredentials(fields: {
  refresh_token: string;
  connected_email: string | null;
  calendar_id: string;
}): Promise<void> {
  const { error } = await getSupabase()
    .from("google_credentials")
    .upsert({ id: true, ...fields, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function clearCredentials(): Promise<void> {
  const { error } = await getSupabase().from("google_credentials").delete().eq("id", true);
  if (error) throw new Error(error.message);
}

/** Best-effort revoke, so disconnecting also drops the grant on Google's side. */
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
  } catch {
    // Local record still gets cleared; nothing useful to do here.
  }
}

// --- Calendar calls ---------------------------------------------------------

async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(`${CALENDAR_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return {};
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      (json as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new GoogleAuthError(`Google refused the request (${detail}).`);
    }
    throw new Error(detail);
  }
  return json as Record<string, unknown>;
}

export type EventPayload = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: { email: string }[];
};

export type EventResult = {
  id: string;
  meetUrl: string | null;
  htmlLink: string | null;
};

function readEvent(json: Record<string, unknown>): EventResult {
  const conference = json.conferenceData as
    | { entryPoints?: { entryPointType?: string; uri?: string }[] }
    | undefined;
  const videoEntry = conference?.entryPoints?.find((e) => e.entryPointType === "video");
  return {
    id: String(json.id ?? ""),
    meetUrl:
      (typeof json.hangoutLink === "string" ? json.hangoutLink : null) ?? videoEntry?.uri ?? null,
    htmlLink: typeof json.htmlLink === "string" ? json.htmlLink : null,
  };
}

/**
 * Creates the meeting and emails every attendee. `withMeet` asks Google to
 * generate a Meet link, which needs conferenceDataVersion=1.
 */
export async function insertEvent(
  accessToken: string,
  calendarId: string,
  payload: EventPayload,
  withMeet: boolean,
): Promise<EventResult> {
  const body: Record<string, unknown> = { ...payload };
  if (withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const json = await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return readEvent(json);
}

/**
 * Creates the event with a Meet link attached.
 *
 * Whether a calendar can host Meet is readable from the calendar's own
 * record, but that needs a broader scope than calendar.events - asking for
 * it would mean requesting permission to read the whole calendar just to
 * answer one question. So the link is simply requested, and if conferencing
 * is what Google objects to, the event is created without it rather than
 * losing the invitation altogether.
 */
export async function insertEventWithMeet(
  accessToken: string,
  calendarId: string,
  payload: EventPayload,
): Promise<EventResult> {
  try {
    return await insertEvent(accessToken, calendarId, payload, true);
  } catch (e) {
    if (e instanceof GoogleAuthError) throw e;
    const detail = e instanceof Error ? e.message.toLowerCase() : "";
    const aboutConferencing =
      detail.includes("conference") || detail.includes("hangout") || detail.includes("meet");
    if (!aboutConferencing) throw e;
    return insertEvent(accessToken, calendarId, payload, false);
  }
}

/**
 * Moves or re-sends an existing event. Patch merges scalar fields, but any
 * array it's given replaces the old one outright - which is what we want for
 * attendees, so removed members drop off and new ones are added.
 */
export async function patchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  payload: Partial<EventPayload>,
): Promise<EventResult> {
  const json = await calendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
      eventId,
    )}?conferenceDataVersion=1&sendUpdates=all`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  return readEvent(json);
}

