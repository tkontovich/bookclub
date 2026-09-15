"use client";

// MOCK ONLY - calendar invite UI pieces. Nothing here talks to Google or
// the database; every button just flips the fake state in mockState.ts.
import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/util";
import {
  formatDuration,
  formatTime,
  formatTimeRange,
  inviteeCount,
  setMock,
  useMock,
} from "./mockState";

type MemberLite = { id: string; name: string };

const DURATIONS = [60, 90, 120, 150, 180];

// Every half hour, 8:00 AM to 11:30 PM.
const START_TIMES = Array.from({ length: 32 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/* ---------- Settings: calendar panel ------------------------------------ */

export function CalendarSettingsPanel({
  members,
  bookTitle,
  nextMeetingDate,
}: {
  members: MemberLite[];
  bookTitle: string | null;
  nextMeetingDate: string | null;
}) {
  const mock = useMock();
  const [startTime, setStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const time = startTime ?? mock.startTime;
  const minutes = duration ?? mock.durationMinutes;
  const dirty = time !== mock.startTime || minutes !== mock.durationMinutes;
  const count = inviteeCount(mock, members);

  return (
    <section className="panel space-y-4 p-5">
      <h2 className="label text-term-fg">Calendar invites</h2>

      {/* Connection */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label shrink-0">Google Calendar</span>
        <span className="-translate-y-1 hidden flex-1 border-b border-dotted border-term-fg/30 sm:block" />
        {mock.connected ? (
          <>
            <span className="text-sm text-term-green">● Connected</span>
            <button
              type="button"
              onClick={() => setMock({ connected: false })}
              className="label hover:text-term-fg"
            >
              [ Disconnect ]
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMock({ connected: true })}
            className="btn btn-primary"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Meeting time */}
      <div className="space-y-3 border-t border-term-fg/20 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="mockStartTime" className="label block">
              Start time · Pacific
            </label>
            <select
              id="mockStartTime"
              value={time}
              onChange={(e) => {
                setStartTime(e.target.value);
                setSaved(false);
              }}
              className="w-full"
            >
              {START_TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatTime(t)} PT
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mockDuration" className="label block">
              Duration
            </label>
            <select
              id="mockDuration"
              value={minutes}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setSaved(false);
              }}
              className="w-full"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              setMock({ startTime: time, durationMinutes: minutes });
              setStartTime(null);
              setDuration(null);
              setSaved(true);
            }}
            className="btn btn-primary"
          >
            Save meeting time
          </button>
          {saved && <span className="label text-term-green">Saved</span>}
          {dirty && mock.connected && mock.invite === "sent" && (
            <span className="text-xs text-term-dim">
              Saving moves the upcoming invite to the new time.
            </span>
          )}
        </div>
      </div>

      {/* Upcoming invite */}
      <div className="space-y-2 border-t border-term-fg/20 pt-4">
        <span className="label block">Upcoming invite</span>
        {!nextMeetingDate ? (
          <p className="text-xs text-term-dim">
            No meeting scheduled. An invite goes out when the next meeting date is set.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-term-fg/25 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-term-bright">CLIT Club: {bookTitle ?? "Next book"}</p>
              <p className="text-xs text-term-fg">
                {formatDate(nextMeetingDate)} ·{" "}
                {formatTimeRange(mock.startTime, mock.durationMinutes)} PT
              </p>
            </div>
            <InviteStatus count={count} />
          </div>
        )}
      </div>
    </section>
  );
}

function InviteStatus({ count }: { count: number }) {
  const mock = useMock();

  if (!mock.connected) {
    return <span className="label">Not connected</span>;
  }
  if (mock.invite === "sent") {
    return <span className="text-xs text-term-green">✓ Sent to {count} members</span>;
  }
  if (mock.invite === "failed") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-term-bright">! Failed to send</span>
        <button type="button" onClick={() => setMock({ invite: "sent" })} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-term-dim">Not sent</span>
      <button type="button" onClick={() => setMock({ invite: "sent" })} className="btn">
        Send invite
      </button>
    </div>
  );
}

/* ---------- Start book form: send toggle -------------------------------- */

export function InviteToggle({ members }: { members: MemberLite[] }) {
  const mock = useMock();
  const count = inviteeCount(mock, members);

  if (!mock.connected) {
    return (
      <p className="label border-t border-term-fg/20 pt-3">
        Calendar invites are off.{" "}
        <Link href="/settings" className="underline hover:text-term-fg">
          Connect Google Calendar
        </Link>{" "}
        to send one automatically.
      </p>
    );
  }

  return (
    <label className="flex cursor-pointer items-start gap-2 border-t border-term-fg/20 pt-3">
      <input type="checkbox" name="mockSendInvite" defaultChecked className="mt-0.5" />
      <span>
        <span className="label block text-term-fg">Send calendar invite</span>
        <span className="block text-xs text-term-dim">
          To {count} members · {formatTimeRange(mock.startTime, mock.durationMinutes)} PT
        </span>
      </span>
    </label>
  );
}

/* ---------- Homepage: meeting time + invite line ------------------------ */

export function MeetingTime() {
  const mock = useMock();
  return <span className="text-term-dim"> · {formatTime(mock.startTime)} PT</span>;
}

/** One quiet line; details and retrying live in settings. */
export function InviteStatusRow({ members }: { members: MemberLite[] }) {
  const mock = useMock();
  const count = inviteeCount(mock, members);

  if (!mock.connected || mock.invite === "none") return null;

  return (
    <div className="border-t border-term-fg/25 px-5 py-3 text-xs">
      {mock.invite === "sent" ? (
        <span className="text-term-green">✓ Calendar invite sent to {count} members</span>
      ) : (
        <span className="text-term-bright">
          ! Calendar invite didn&apos;t send.{" "}
          <Link href="/settings" className="underline hover:text-term-fg">
            Retry in settings
          </Link>
        </span>
      )}
    </div>
  );
}

/* ---------- Edit current book modal: date change note ------------------- */

export function InviteMoveNote() {
  const mock = useMock();
  if (!mock.connected || mock.invite !== "sent") return null;
  return (
    <p className="text-xs text-term-dim">
      Changing the date moves the existing invite, and Google emails everyone the update.
    </p>
  );
}
