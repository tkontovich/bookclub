"use client";

import { startCurrentBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookSearchFields } from "./BookSearchFields";

export function StartBookForm({ members }: { members: Member[] }) {
  return (
    <form action={startCurrentBook} className="space-y-4">
      <BookSearchFields>
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
          <input
            id="nextMeetingDate"
            type="date"
            name="nextMeetingDate"
            required
            className="w-full"
          />
        </div>
      </BookSearchFields>

      <button type="submit" className="btn btn-primary">
        Start this book
      </button>
    </form>
  );
}
