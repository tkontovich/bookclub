"use client";

import { useState, useTransition } from "react";
import { searchBooks } from "@/lib/actions";
import type { BookSearchResult } from "@/lib/types";
import { BookCover } from "./BookCover";

// Renders the title/author/coverUrl/googleBooksId fields under those exact
// names, so any <form> wrapping this can be handled by an action that
// reads plain FormData. `children` lands inside the same bordered group so
// callers can add their own fields (picker, dates) to one cohesive set.
export function BookSearchFields({
  initialTitle = "",
  initialAuthor = "",
  initialCoverUrl = "",
  initialGoogleBooksId = "",
  children,
}: {
  initialTitle?: string;
  initialAuthor?: string;
  initialCoverUrl?: string;
  initialGoogleBooksId?: string;
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [googleBooksId, setGoogleBooksId] = useState(initialGoogleBooksId);
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [isSearching, startSearch] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function runSearch() {
    startSearch(async () => {
      setStatus(null);
      try {
        const found = await searchBooks(query);
        setResults(found);
        if (found.length === 0) setStatus("No matches — type the details in below.");
      } catch {
        setResults([]);
        setStatus("Lookup unavailable — type the details in below.");
      }
    });
  }

  function pick(result: BookSearchResult) {
    setTitle(result.title);
    setAuthor(result.author);
    setCoverUrl(result.coverUrl ?? "");
    setGoogleBooksId(result.googleBooksId);
    setResults([]);
    setStatus(null);
  }

  return (
    <fieldset className="panel space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="label">Look up cover &amp; details</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="TITLE OR AUTHOR…"
            className="flex-1"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={isSearching || !query.trim()}
            className="btn"
          >
            {isSearching ? "…" : "Find"}
          </button>
        </div>
      </div>

      {status && <p className="label">{status}</p>}

      {results.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto border border-term-fg/20 p-1">
          {results.map((r) => (
            <li key={r.googleBooksId}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center gap-2 p-1 text-left hover:bg-term-fg/10"
              >
                <span className="w-8 shrink-0">
                  <BookCover src={r.coverUrl} alt={r.title} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-term-bright">{r.title}</span>
                  <span className="label block truncate">{r.author}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3 border-t border-term-fg/20 pt-3">
        {coverUrl && (
          <div className="w-16 shrink-0">
            <BookCover src={coverUrl} alt={title} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input
            type="text"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="TITLE"
            required
            className="w-full"
          />
          <input
            type="text"
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="AUTHOR"
            className="w-full"
          />
          {children}
        </div>
      </div>

      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="googleBooksId" value={googleBooksId} />
    </fieldset>
  );
}
