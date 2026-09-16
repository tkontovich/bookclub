"use client";

import { useState, useTransition } from "react";
import { saveMeetingSettings } from "@/lib/actions";
import { DURATIONS, START_TIMES, formatDuration } from "@/lib/meeting-options";
import { formatMeetingRange, formatTimeOfDay } from "@/lib/util";
import { Modal } from "./Modal";

/**
 * The meeting time reads as one line, like a member row, with the editing
 * controls tucked behind [ Edit ].
 */
export function MeetingTimeRow({
  startTime,
  durationMinutes,
  inviteSent,
}: {
  /** "HH:MM" */
  startTime: string;
  durationMinutes: number;
  /** Whether an invite is already out, so saving would move it. */
  inviteSent: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-t border-term-fg/20 pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label shrink-0">Meeting time</span>
        <span className="-translate-y-1 hidden flex-1 border-b border-dotted border-term-fg/30 sm:block" />
        <span className="text-sm text-term-bright">
          {formatMeetingRange(startTime, durationMinutes)} PT
        </span>
        <span className="label shrink-0">{formatDuration(durationMinutes)}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="label shrink-0 hover:text-term-fg"
        >
          [ Edit ]
        </button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Meeting time">
        {editing && (
          <MeetingTimeForm
            startTime={startTime}
            durationMinutes={durationMinutes}
            inviteSent={inviteSent}
            onDone={() => setEditing(false)}
          />
        )}
      </Modal>
    </div>
  );
}

function MeetingTimeForm({
  startTime,
  durationMinutes,
  inviteSent,
  onDone,
}: {
  startTime: string;
  durationMinutes: number;
  inviteSent: boolean;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const outcome = await saveMeetingSettings(formData);
      if (outcome.ok) onDone();
      else setError(outcome.message);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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

      {inviteSent && (
        <p className="text-xs text-term-dim">
          Saving moves the invite that&apos;s already out, and Google emails everyone the update.
        </p>
      )}

      {error && (
        <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
          ! {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Saving…" : "Save meeting time"}
        </button>
        <button type="button" onClick={onDone} className="btn">
          Cancel
        </button>
      </div>
    </form>
  );
}
