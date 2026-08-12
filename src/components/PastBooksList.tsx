"use client";

import { useMemo, useState } from "react";
import { BookCover } from "./BookCover";

export type PastBookView = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  pickerName: string;
  dateDiscussed: string | null;
  dateDiscussedLabel: string;
  average: number | null;
  scores: { memberName: string; score: number | null; absent: boolean }[];
};

type SortOption = "newest" | "oldest" | "highest" | "lowest";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest score" },
  { value: "lowest", label: "Lowest score" },
];

export function PastBooksList({ books }: { books: PastBookView[] }) {
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState("all");
  const [sort, setSort] = useState<SortOption>("newest");

  const pickers = useMemo(
    () => Array.from(new Set(books.map((b) => b.pickerName))).sort(),
    [books],
  );

  const visible = books
    .filter((b) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q);
      const matchesPicker = picker === "all" || b.pickerName === picker;
      return matchesQuery && matchesPicker;
    })
    .sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (a.dateDiscussed ?? "").localeCompare(b.dateDiscussed ?? "");
        case "highest":
          return (b.average ?? -Infinity) - (a.average ?? -Infinity);
        case "lowest":
          return (a.average ?? Infinity) - (b.average ?? Infinity);
        case "newest":
        default:
          return (b.dateDiscussed ?? "").localeCompare(a.dateDiscussed ?? "");
      }
    });

  if (books.length === 0) {
    return <p className="text-neutral-500">No books finished yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or author…"
          className="min-w-[180px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="all">Everyone</option>
          {pickers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">No books match.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((book) => (
            <li
              key={book.id}
              className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="w-20 shrink-0">
                <BookCover src={book.coverUrl} alt={book.title} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-medium">{book.title}</h3>
                {book.author && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{book.author}</p>
                )}
                <p className="text-sm text-neutral-500">Picked by {book.pickerName}</p>
                <p className="text-sm text-neutral-500">Discussed {book.dateDiscussedLabel}</p>
                {book.average !== null && (
                  <p className="text-sm font-medium">Average score: {book.average.toFixed(1)}</p>
                )}
                {book.scores.length > 0 && (
                  <details className="pt-1 text-sm">
                    <summary className="cursor-pointer text-neutral-500">
                      Scores ({book.scores.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {book.scores.map((s, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{s.memberName}</span>
                          <span className="tabular-nums">
                            {s.absent ? "Absent" : s.score!.toFixed(1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
