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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH TITLE OR AUTHOR…"
          className="min-w-[180px] flex-1"
        />
        <select value={picker} onChange={(e) => setPicker(e.target.value)}>
          <option value="all">Everyone</option>
          {pickers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <p className="rule">
        {visible.length} of {books.length} records {"-".repeat(120)}
      </p>

      {books.length === 0 ? (
        <p className="label">No books archived yet.</p>
      ) : visible.length === 0 ? (
        <p className="label">No books match.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((book) => (
            <li key={book.id} className="panel flex gap-4 p-4">
              <div className="w-20 shrink-0">
                <BookCover src={book.coverUrl} alt={book.title} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl leading-tight text-term-bright">
                    {book.title}
                  </h3>
                  {book.average !== null && (
                    <span className="font-display shrink-0 text-2xl leading-none text-term-green">
                      {book.average.toFixed(1)}
                    </span>
                  )}
                </div>
                {book.author && <p className="text-sm text-term-fg">{book.author}</p>}
                <p className="label">
                  {book.pickerName} · {book.dateDiscussedLabel}
                </p>
                {book.scores.length > 0 && (
                  <details className="disclosure pt-1">
                    <summary className="label hover:text-term-fg">
                      <span>Scores ({book.scores.length})</span>
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {book.scores.map((s, i) => (
                        <li key={i} className="flex items-baseline gap-2 text-sm">
                          <span className="shrink-0 text-term-fg">{s.memberName}</span>
                          <span className="-translate-y-1 flex-1 border-b border-dotted border-term-fg/30" />
                          <span
                            className={
                              s.absent
                                ? "label shrink-0"
                                : "shrink-0 tabular-nums text-term-bright"
                            }
                          >
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
