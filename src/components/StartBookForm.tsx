"use client";

import { startCurrentBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookSearchFields } from "./BookSearchFields";
import { DatePicker } from "./DatePicker";
import { InviteToggle } from "./mock/CalendarMock";

export function StartBookForm({
  members,
  previewOnly = false,
}: {
  members: Member[];
  /** MOCK: render the form without wiring it to the real action. */
  previewOnly?: boolean;
}) {
  return (
    <form
      action={previewOnly ? undefined : startCurrentBook}
      onSubmit={previewOnly ? (e) => e.preventDefault() : undefined}
    >
      <BookSearchFields
        footer={
          <button type="submit" disabled={previewOnly} className="btn btn-primary">
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
        <InviteToggle members={members} />
      </BookSearchFields>
    </form>
  );
}
