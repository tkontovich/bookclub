export type Member = {
  id: string;
  name: string;
  /** Only used for calendar invites; never rendered publicly. */
  email: string | null;
  active: boolean;
  created_at: string;
};

export type BookStatus = "candidate" | "current" | "past" | "rejected";

export type Book = {
  id: string;
  round_id: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  google_books_id: string | null;
  picker_id: string;
  status: BookStatus;
  date_discussed: string | null;
  created_at: string;
};

export type Score = {
  id: string;
  book_id: string;
  member_id: string;
  score: number | null;
  absent: boolean;
  created_at: string;
};

export type ClubSettings = {
  id: boolean;
  next_meeting_date: string | null;
  /** Postgres `time`, e.g. "19:00:00". */
  meeting_start_time: string;
  meeting_duration_minutes: number;
  /** IANA zone, e.g. "America/Los_Angeles". */
  meeting_timezone: string;
};

/** Singleton row holding the club's Google connection. */
export type GoogleCredentials = {
  id: boolean;
  refresh_token: string;
  connected_email: string | null;
  calendar_id: string;
  updated_at: string;
};

export type InviteStatus = "pending" | "sent" | "failed";

export type CalendarInvite = {
  book_id: string;
  google_event_id: string | null;
  meet_url: string | null;
  status: InviteStatus;
  error: string | null;
  recipient_count: number;
  sent_at: string | null;
  created_at: string;
};

/**
 * What a server action hands back to a client component. Actions must not
 * throw for expected failures: React replaces a thrown error's message with
 * a generic "error #441" in production, so the reason never reaches anyone.
 */
export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; message: string };

export type BookSearchResult = {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
};
