import type { BookSearchResult } from "./types";

// Open Library is the default provider because it needs no key and has a
// workable anonymous rate limit. Google Books has nicer metadata but its
// keyless quota is shared and permanently exhausted (HTTP 429), so it's
// only used when GOOGLE_BOOKS_API_KEY is configured.

const TIMEOUT_MS = 8000;

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

/** Open Library often repeats an author across editions of the same work. */
function joinAuthors(names: string[] | undefined): string {
  if (!names?.length) return "Unknown author";
  return [...new Set(names)].join(", ");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Book search failed (HTTP ${res.status}).`);
  return res.json();
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "6",
    fields: "key,title,author_name,cover_i",
  });
  const data = (await fetchJson(`https://openlibrary.org/search.json?${params}`)) as {
    docs?: OpenLibraryDoc[];
  };

  return (data.docs ?? [])
    .filter((doc) => doc.title)
    .map((doc) => ({
      // Stored in books.google_books_id - it's just an opaque provider ref.
      googleBooksId: doc.key ?? doc.title!,
      title: doc.title!,
      author: joinAuthors(doc.author_name),
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
    }));
}

async function searchGoogleBooks(query: string, apiKey: string): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q: query, maxResults: "6", key: apiKey });
  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?${params}`,
  )) as { items?: GoogleVolume[] };

  return (data.items ?? []).map((item) => {
    const info = item.volumeInfo ?? {};
    const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
    return {
      googleBooksId: item.id,
      title: info.title ?? "Untitled",
      author: joinAuthors(info.authors),
      coverUrl: cover ? cover.replace("http://", "https://") : null,
    };
  });
}

/** Throws on provider failure so the UI can say so instead of showing nothing. */
export async function searchForBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) {
    try {
      return await searchGoogleBooks(trimmed, apiKey);
    } catch {
      // Fall through to Open Library rather than failing the search.
    }
  }

  return searchOpenLibrary(trimmed);
}
