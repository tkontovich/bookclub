import Link from "next/link";
import { disconnectGoogle, saveMeetingSettings, sendInvite } from "@/lib/actions";
import { formatDate, formatMeetingRange, formatTimeOfDay } from "@/lib/util";
import type { CalendarInvite } from "@/lib/types";
import { DURATIONS, START_TIMES, formatDuration } from "@/lib/meeting-options";

// Plain forms posting to server actions - no client state needed, so the
// panel works even before React hydrates.

const BANNERS: Record<string, { text: string; tone: "good" | "bad" }> = {
  connected: { text: "Google Calendar connected.", tone: "good" },
  failed: { text: "Couldn't finish connecting to Google. Try again.", tone: "bad" },
  denied: { text: "Google connection was cancelled.", tone: "bad" },
  state: { text: "That connection link expired. Start again.", tone: "bad" },
};

export function CalendarSettings({
  connected,
  connectedEmail,
  startTime,
  durationMinutes,
  nextMeetingDate,
  bookTitle,
  bookId,
  invite,
  invitableCount,
  memberCount,
  banner,
}: {
  connected: boolean;
  connectedEmail: string | null;
  /** "HH:MM", already trimmed from the stored "HH:MM:SS". */
  startTime: string;
  durationMinutes: number;
  nextMeetingDate: string | null;
  bookTitle: string | null;
  bookId: string | null;
  invite: CalendarInvite | null;
  invitableCount: number;
  memberCount: number;
  banner?: string;
}) {
  const notice = banner ? BANNERS[banner] : undefined;

  return (
    <section className="panel space-y-4 p-5">
      <h2 className="label text-term-fg">Calendar invites</h2>

      {notice && (
        <p
          className={
            notice.tone === "good"
              ? "border border-term-green/50 px-3 py-2 text-xs uppercase tracking-widest text-term-green"
              : "border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright"
          }
        >
          {notice.text}
        </p>
      )}

      {/* Connection */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label shrink-0">Google Calendar</span>
        <span className="-translate-y-1 hidden flex-1 border-b border-dotted border-term-fg/30 sm:block" />
        {connected ? (
          <>
            <span className="text-sm text-term-green">
              ● Connected{connectedEmail ? ` · ${connectedEmail}` : ""}
            </span>
            <form action={disconnectGoogle}>
              <button type="submit" className="label hover:text-term-fg">
                [ Disconnect ]
              </button>
            </form>
          </>
        ) : (
          <a href="/api/google/connect" className="btn btn-primary">
            Connect Google Calendar
          </a>
        )}
      </div>
      {!connected && (
        <p className="text-xs text-term-dim">
          Invites are sent from your own Google account, so they look the same as the ones you send
          by hand. Google shows an &quot;unverified app&quot; warning once; continue past it.
        </p>
      )}

      {/* Meeting time */}
      <form action={saveMeetingSettings} className="space-y-3 border-t border-term-fg/20 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="startTime" className="label block">
              Start time · Pacific
            </label>
            <select id="startTime" name="startTime" defaultValue={startTime} className="w-full">
              {START_TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatTimeOfDay(t)} PT
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="durationMinutes" className="label block">
              Duration
            </label>
            <select
              id="durationMinutes"
              name="durationMinutes"
              defaultValue={durationMinutes}
              className="w-full"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {formatDuration(d)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary">
            Save meeting time
          </button>
          {invite?.status === "sent" && (
            <span className="text-xs text-term-dim">
              Saving moves the invite that&apos;s already out.
            </span>
          )}
        </div>
      </form>

      {/* Upcoming invite */}
      <div className="space-y-2 border-t border-term-fg/20 pt-4">
        <span className="label block">Upcoming invite</span>
        {!nextMeetingDate || !bookId ? (
          <p className="text-xs text-term-dim">
            No meeting scheduled. An invite goes out when the next meeting date is set.
          </p>
        ) : (
          <div className="space-y-2 border border-term-fg/25 p-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-term-bright">
                  CLIT Club: {bookTitle ?? "Next book"}
                </p>
                <p className="text-xs text-term-fg">
                  {formatDate(nextMeetingDate)} · {formatMeetingRange(startTime, durationMinutes)}{" "}
                  PT
                </p>
              </div>
              <InviteState connected={connected} invite={invite} bookId={bookId} />
            </div>

            {invite?.status === "failed" && invite.error && (
              <p className="text-xs text-term-dim">{invite.error}</p>
            )}
            {invite?.meet_url && (
              <p className="truncate text-xs text-term-dim">
                Meet link:{" "}
                <a
                  href={invite.meet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-term-fg"
                >
                  {invite.meet_url.replace("https://", "")}
                </a>
              </p>
            )}
            {invitableCount < memberCount && (
              <p className="text-xs text-term-dim">
                {memberCount - invitableCount} member
                {memberCount - invitableCount === 1 ? " has" : "s have"} no email and won&apos;t be
                invited.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function InviteState({
  connected,
  invite,
  bookId,
}: {
  connected: boolean;
  invite: CalendarInvite | null;
  bookId: string;
}) {
  if (!connected) {
    return <span className="label shrink-0">Not connected</span>;
  }

  if (invite?.status === "sent") {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs text-term-green">✓ Sent to {invite.recipient_count} members</span>
        <form action={sendInvite}>
          <input type="hidden" name="bookId" value={bookId} />
          <button type="submit" className="label hover:text-term-fg">
            [ Resend ]
          </button>
        </form>
      </div>
    );
  }

  if (invite?.status === "failed") {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-xs text-term-bright">! Failed to send</span>
        <form action={sendInvite}>
          <input type="hidden" name="bookId" value={bookId} />
          <button type="submit" className="btn btn-primary">
            Retry
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="text-xs text-term-dim">Not sent</span>
      <form action={sendInvite}>
        <input type="hidden" name="bookId" value={bookId} />
        <button type="submit" className="btn">
          Send invite
        </button>
      </form>
    </div>
  );
}

/** Shown on the homepage: one quiet line, details live here in settings. */
export function InviteLine({ invite }: { invite: CalendarInvite | null }) {
  if (!invite) return null;

  return (
    <div className="border-t border-term-fg/25 px-5 py-3 text-xs">
      {invite.status === "sent" ? (
        <span className="text-term-green">
          ✓ Calendar invite sent to {invite.recipient_count} members
        </span>
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
