"use client";

import { useState, useTransition } from "react";
import { searchBooks } from "@/lib/actions";
import type { BookSearchResult } from "@/lib/types";
import { BookCover } from "./BookCover";

// Renders the title/author/coverUrl/googleBooksId fields under those exact
// names, so any <form> wrapping this can be handled by an action that
// reads plain FormData - no props needed for wiring it up.
export function BookSearchFields() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [googleBooksId, setGoogleBooksId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isSearching, startSearch] = useTransition();

  function runSearch() {
    startSearch(async () => {
      const found = await searchBooks(query);
      setResults(found);
    });
  }

  function pick(result: BookSearchResult) {
    setTitle(result.title);
    setAuthor(result.author);
    setCoverUrl(result.coverUrl ?? "");
    setGoogleBooksId(result.googleBooksId);
    setResults([]);
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
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
          placeholder="Search for a book…"
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={isSearching || !query.trim()}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {isSearching ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {results.map((r) => (
            <li key={r.googleBooksId}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-center gap-2 rounded-md p-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="w-8 shrink-0">
                  <BookCover src={r.coverUrl} alt={r.title} />
                </span>
                <span>
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-neutral-500">{r.author}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3">
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
            placeholder="Title"
            required
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            type="text"
            name="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Author"
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </div>

      <input type="hidden" name="coverUrl" value={coverUrl} />
      <input type="hidden" name="googleBooksId" value={googleBooksId} />
    </fieldset>
  );
}
