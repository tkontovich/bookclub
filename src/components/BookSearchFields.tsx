"use client";

import { useState, useTransition } from "react";
import { searchBooks } from "@/lib/actions";
import type { BookSearchResult } from "@/lib/types";
import { BookCover } from "./BookCover";

// Renders the title/author/coverUrl/googleBooksId fields under those exact
// names, so any <form> wrapping this can be handled by an action that
// reads plain FormData. `children` and `footer` land inside the same
// bordered group so callers can add their own fields and submit button to
// one cohesive set.
export function BookSearchFields({
  initialTitle = "",
  initialAuthor = "",
  initialCoverUrl = "",
  initialGoogleBooksId = "",
  children,
  footer,
}: {
  initialTitle?: string;
  initialAuthor?: string;
  initialCoverUrl?: string;
  initialGoogleBooksId?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [googleBooksId, setGoogleBooksId] = useState(initialGoogleBooksId);
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [isSearching, startSearch] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  // The detail fields stay hidden until a search result is chosen, which
  // nudges people through lookup so covers actually get filled in. Editing
  // an existing book starts revealed. Once revealed it stays that way, so
  // clearing the title doesn't yank the fields out from under you.
  const [revealed, setRevealed] = useState(Boolean(initialTitle));

  function runSearch() {
    startSearch(async () => {
      setStatus(null);
      try {
        const found = await searchBooks(query);
        setResults(found);
        if (found.length === 0) setStatus("No matches for that.");
      } catch {
        setResults([]);
        setStatus("Lookup unavailable right now.");
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
    setRevealed(true);
  }

  return (
    <fieldset className="panel space-y-3 p-4">
      <div className="space-y-1.5">
        <label className="label">Search for the book</label>
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

      {status && (
        <p className="label">
          {status}{" "}
          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="underline hover:text-term-fg"
            >
              Enter it by hand
            </button>
          )}
        </p>
      )}

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

      {revealed ? (
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
      ) : (
        <p className="label border-t border-term-fg/20 pt-3">
          Pick a result to fill in the details.
        </p>
      )}

      {revealed && footer && (
        <div className="border-t border-term-fg/20 pt-3">{footer}</div>
      )}

      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="googleBooksId" value={googleBooksId} />
    </fieldset>
  );
}
