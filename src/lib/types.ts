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
  description: string | null;
  google_books_id: string | null;
  picker_id: string;
  status: BookStatus;
  date_discussed: string | null;
  created_at: string;
};

export type Round = {
  id: string;
  picker_id: string;
  status: "open" | "closed";
  created_at: string;
};

export type Vote = {
  id: string;
  round_id: string;
  book_id: string;
  member_id: string;
  created_at: string;
};

export type Score = {
  id: string;
  book_id: string;
  member_id: string;
  score: number;
  created_at: string;
};

export type ClubSettings = {
  id: boolean;
  next_meeting_date: string | null;
  next_picker_id: string | null;
};

export type BookSearchResult = {
  googleBooksId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string;
};
