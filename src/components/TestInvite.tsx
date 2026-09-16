"use client";

import { useState, useTransition } from "react";
import { cancelTestInvite, sendTestInvite } from "@/lib/actions";
import { START_TIMES } from "@/lib/meeting-options";
import { formatTimeOfDay, todayIsoDate } from "@/lib/util";
import { DatePicker } from "./DatePicker";
import type { TestEventResult } from "@/lib/invites";

export type TestRecipient = { id: string; name: string; email: string | null };

/**
 * Sends a throwaway invitation to a chosen few, so delivery can be checked
 * before the club-wide send. Separate event, separate Meet link: nothing
 * here changes the real invite.
 */
export function TestInvite({
  members,
  defaultDate,
  defaultStartTime,
}: {
  members: TestRecipient[];
  defaultDate: string | null;
  /** "HH:MM" */
  defaultStartTime: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TestEventResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const withEmail = members.filter((m) => m.email && m.email.trim() !== "");

  function handleSend(formData: FormData) {
    setError(null);
    setCancelled(false);
    startTransition(async () => {
      try {
        setResult(await sendTestInvite(formData));
      } catch (e) {
        setResult(null);
        setError(e instanceof Error ? e.message : "Couldn't send the test invite.");
      }
    });
  }

  function handleCancel(eventId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await cancelTestInvite(eventId);
        setResult(null);
        setCancelled(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't cancel the test event.");
      }
    });
  }

  return (
    <section className="panel space-y-4 p-5">
      <h2 className="label text-term-fg">Test invite</h2>
      <p className="text-xs text-term-dim">
        Sends a real invitation to just the people you pick, so you can check it arrives before the
        club-wide send. It&apos;s a separate event and doesn&apos;t affect the upcoming invite
        above.
      </p>

      {withEmail.length === 0 ? (
        <p className="label">No members have an email yet. Add one above to test with.</p>
      ) : (
        <form action={handleSend} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="testSummary" className="label block">
              Event name
            </label>
            <input
              id="testSummary"
              type="text"
              name="summary"
              defaultValue="CLIT Club test invite"
              required
              className="w-full"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="testDate" className="label block">
                Date
              </label>
              <DatePicker
                id="testDate"
                name="date"
                defaultValue={defaultDate ?? todayIsoDate()}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="testStartTime" className="label block">
                Start time · Pacific
              </label>
              <select
                id="testStartTime"
                name="startTime"
                defaultValue={defaultStartTime}
                className="w-full"
              >
                {START_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeOfDay(t)} PT
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="space-y-2 border border-term-fg/25 p-3">
            <legend className="label px-1">Send to</legend>
            {members.map((member) => {
              const hasEmail = Boolean(member.email && member.email.trim() !== "");
              return (
                <label
                  key={member.id}
                  className={
                    hasEmail
                      ? "flex cursor-pointer items-center gap-2 text-sm"
                      : "flex items-center gap-2 text-sm opacity-50"
                  }
                >
                  <input
                    type="checkbox"
                    name="recipients"
                    value={member.id}
                    disabled={!hasEmail}
                  />
                  <span className="uppercase tracking-wider text-term-bright">{member.name}</span>
                  <span className="truncate text-xs text-term-dim">
                    {member.email || "no email"}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {error && (
            <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
              ! {error}
            </p>
          )}

          {cancelled && (
            <p className="label text-term-green">
              Test event deleted. Everyone invited gets a cancellation.
            </p>
          )}

          {result ? (
            <div className="space-y-2 border border-term-green/50 p-3">
              <p className="text-xs text-term-green">
                ✓ Test invite sent to {result.recipients}{" "}
                {result.recipients === 1 ? "person" : "people"}
              </p>
              {result.meetUrl ? (
                <p className="truncate text-xs text-term-dim">
                  Meet link:{" "}
                  <a
                    href={result.meetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-term-fg"
                  >
                    {result.meetUrl.replace("https://", "")}
                  </a>
                </p>
              ) : (
                <p className="text-xs text-term-dim">
                  No Meet link came back - this calendar may not offer them.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCancel(result.eventId)}
                  className="btn"
                >
                  {isPending ? "Cancelling…" : "Cancel test event"}
                </button>
                <span className="text-xs text-term-dim">
                  Removes it from everyone&apos;s calendar.
                </span>
              </div>
            </div>
          ) : (
            <button type="submit" disabled={isPending} className="btn btn-primary">
              {isPending ? "Sending…" : "Send test invite"}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
