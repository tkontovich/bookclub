"use client";

import { startCurrentBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookSearchFields } from "./BookSearchFields";
import { DatePicker } from "./DatePicker";

export function StartBookForm({
  members,
  googleConnected,
  invitableCount,
}: {
  members: Member[];
  googleConnected: boolean;
  /** Active members with an email - the people an invite would reach. */
  invitableCount: number;
}) {
  return (
    <form action={startCurrentBook}>
      <BookSearchFields
        footer={
          <button type="submit" className="btn btn-primary">
            Start this book
          </button>
        }
      >
        <select name="pickerId" required defaultValue="" className="w-full">
          <option value="" disabled>
            PICKED BY…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="space-y-1.5">
          <label htmlFor="nextMeetingDate" className="label block">
            Next meeting
          </label>
          <DatePicker id="nextMeetingDate" name="nextMeetingDate" required />
        </div>

        {googleConnected ? (
          <label className="flex cursor-pointer items-start gap-2 border-t border-term-fg/20 pt-3">
            <input type="checkbox" name="sendInvite" defaultChecked className="mt-0.5" />
            <span>
              <span className="label block text-term-fg">Send calendar invite</span>
              <span className="block text-xs text-term-dim">
                To {invitableCount} member{invitableCount === 1 ? "" : "s"} with an email
              </span>
            </span>
          </label>
        ) : (
          <p className="label border-t border-term-fg/20 pt-3">
            Calendar invites are off. Connect Google Calendar in settings to send one.
          </p>
        )}
      </BookSearchFields>
    </form>
  );
}
