import type { BookSearchResult } from "./types";

type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

export async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ q: trimmed, maxResults: "5" });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
  if (!res.ok) return [];

  const data: { items?: GoogleBooksVolume[] } = await res.json();
  const items = data.items ?? [];

  return items.map((item) => {
    const info = item.volumeInfo ?? {};
    const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
    return {
      googleBooksId: item.id,
      title: info.title ?? "Untitled",
      author: info.authors?.length ? info.authors.join(", ") : "Unknown author",
      coverUrl: cover ? cover.replace("http://", "https://") : null,
    };
  });
}
