"use client";

import { useState, useTransition } from "react";
import { addPastBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookSearchFields } from "./BookSearchFields";

export function AddPastBookForm({ members }: { members: Member[] }) {
  const [resetKey, setResetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addPastBook(formData);
      setResetKey((k) => k + 1);
    });
  }

  return (
    <form key={resetKey} action={handleSubmit} className="space-y-4">
      <BookSearchFields />

      <div className="flex flex-wrap items-center gap-4">
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
        <div className="flex items-center gap-2">
          <label htmlFor="dateDiscussed" className="text-sm text-neutral-500">
            Discussed on
          </label>
          <input
            id="dateDiscussed"
            type="date"
            name="dateDiscussed"
            required
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <legend className="px-1 text-sm font-medium">Scores</legend>
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm">{member.name}</span>
            <input
              type="number"
              name={`score_${member.id}`}
              min={1}
              max={10}
              step={0.1}
              placeholder="Score"
              className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <label className="flex items-center gap-1 text-sm text-neutral-500">
              <input type="checkbox" name={`absent_${member.id}`} />
              Absent
            </label>
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {isPending ? "Adding…" : "Add past book"}
      </button>
    </form>
  );
}
