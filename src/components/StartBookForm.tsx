"use client";

import { startCurrentBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookSearchFields } from "./BookSearchFields";

export function StartBookForm({ members }: { members: Member[] }) {
  return (
    <form action={startCurrentBook} className="space-y-4">
      <BookSearchFields />

      <div className="flex items-center gap-2">
        <label htmlFor="pickerId" className="text-sm text-neutral-500">
          Picked by
        </label>
        <select
          id="pickerId"
          name="pickerId"
          required
          defaultValue=""
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            Select…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Start this book
      </button>
    </form>
  );
}
