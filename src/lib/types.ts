export type Member = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type BookStatus = "candidate" | "current" | "past" | "rejected";

export type Book = {
  id: string;
  round_id: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  google_books_id: string | null;
  picker_id: string;
  status: BookStatus;
  date_discussed: string | null;
  created_at: string;
};

export type Score = {
  id: string;
  book_id: string;
  member_id: string;
  score: number | null;
  absent: boolean;
  created_at: string;
};

export type ClubSettings = {
  id: boolean;
  next_meeting_date: string | null;
};

export type BookSearchResult = {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
};
