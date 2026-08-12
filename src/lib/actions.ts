"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabase } from "./supabase";
import { getBooksForRound, getClubSettings, getCurrentBook, getOpenRound, getVotesForRound } from "./data";
import { MEMBER_COOKIE_NAME } from "./session";
import { searchGoogleBooks } from "./google-books";
import type { BookSearchResult } from "./types";

async function requireMemberId(): Promise<string> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
  if (!memberId) {
    throw new Error("Select who you are at the top of the page first.");
  }
  return memberId;
}

function nonEmpty(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// --- Identity -------------------------------------------------------------

export async function setActiveMember(formData: FormData): Promise<void> {
  const memberId = nonEmpty(formData, "memberId");
  if (!memberId) return;
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE_NAME, memberId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// --- Members / settings -----------------------------------------------------

export async function addMember(formData: FormData): Promise<void> {
  const name = nonEmpty(formData, "name");
  if (!name) throw new Error("Name is required.");

  const { error } = await getSupabase().from("members").insert({ name });
  if (error) {
    if (error.code === "23505") {
      throw new Error(`"${name}" is already a member.`);
    }
    throw new Error(error.message);
  }
  revalidatePath("/settings");
}

export async function removeMember(formData: FormData): Promise<void> {
  const memberId = nonEmpty(formData, "memberId");
  if (!memberId) throw new Error("Missing member.");

  const { error } = await getSupabase().from("members").update({ active: false }).eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/vote");
}

export async function updateNextPicker(formData: FormData): Promise<void> {
  const nextPickerId = nonEmpty(formData, "nextPickerId");

  const { error } = await getSupabase()
    .from("club_settings")
    .update({ next_picker_id: nextPickerId })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/vote");
}

export async function updateNextMeetingDate(formData: FormData): Promise<void> {
  const nextMeetingDate = nonEmpty(formData, "nextMeetingDate");

  const { error } = await getSupabase()
    .from("club_settings")
    .update({ next_meeting_date: nextMeetingDate })
    .eq("id", true);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
}

// --- Proposing + voting -----------------------------------------------------

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  return searchGoogleBooks(query);
}

export async function proposeBooks(formData: FormData): Promise<void> {
  const settings = await getClubSettings();
  if (!settings.next_picker_id) {
    throw new Error("Set who's picking next in Settings before proposing books.");
  }

  const openRound = await getOpenRound();
  if (openRound) {
    throw new Error("A vote is already in progress.");
  }

  const currentBook = await getCurrentBook();
  if (currentBook) {
    throw new Error("Mark the current book as finished before proposing new ones.");
  }

  const slots = ["bookA", "bookB"] as const;
  const books = slots.map((slot) => {
    const title = nonEmpty(formData, `${slot}_title`);
    if (!title) throw new Error("Both books need a title.");
    return {
      title,
      author: nonEmpty(formData, `${slot}_author`),
      cover_url: nonEmpty(formData, `${slot}_coverUrl`),
      description: nonEmpty(formData, `${slot}_description`),
      google_books_id: nonEmpty(formData, `${slot}_googleBooksId`),
    };
  });

  const { data: round, error: roundError } = await getSupabase()
    .from("rounds")
    .insert({ picker_id: settings.next_picker_id, status: "open" })
    .select("id")
    .single();
  if (roundError || !round) throw new Error(roundError?.message ?? "Could not start the vote.");

  const { error: booksError } = await getSupabase().from("books").insert(
    books.map((book) => ({
      ...book,
      round_id: round.id,
      picker_id: settings.next_picker_id,
      status: "candidate",
    })),
  );
  if (booksError) throw new Error(booksError.message);

  const { error: clearPickerError } = await getSupabase()
    .from("club_settings")
    .update({ next_picker_id: null })
    .eq("id", true);
  if (clearPickerError) throw new Error(clearPickerError.message);

  revalidatePath("/vote");
  revalidatePath("/settings");
}

export async function castVote(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const roundId = nonEmpty(formData, "roundId");
  const bookId = nonEmpty(formData, "bookId");
  if (!roundId || !bookId) throw new Error("Missing vote target.");

  const { error } = await getSupabase()
    .from("votes")
    .upsert(
      { round_id: roundId, book_id: bookId, member_id: memberId },
      { onConflict: "round_id,member_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/vote");
}

export async function closeRound(formData: FormData): Promise<void> {
  const roundId = nonEmpty(formData, "roundId");
  if (!roundId) throw new Error("Missing round.");

  const manualWinnerId = nonEmpty(formData, "winnerBookId");

  const currentBook = await getCurrentBook();
  if (currentBook) {
    throw new Error("A book is already current - mark it finished first.");
  }

  const books = await getBooksForRound(roundId);
  const bookIds = new Set(books.map((b) => b.id));

  let winnerId: string | null = null;

  if (manualWinnerId) {
    if (!bookIds.has(manualWinnerId)) throw new Error("Invalid winner.");
    winnerId = manualWinnerId;
  } else {
    const votes = await getVotesForRound(roundId);
    const counts = new Map<string, number>();
    for (const book of books) counts.set(book.id, 0);
    for (const vote of votes) {
      counts.set(vote.book_id, (counts.get(vote.book_id) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const isTie = sorted.length > 1 && sorted[0][1] === sorted[1][1];
    if (!isTie && sorted.length > 0) {
      winnerId = sorted[0][0];
    }
  }

  if (!winnerId) {
    // Tied with no manual override - leave the round open for the group to
    // decide, then close it again with an explicit winner.
    return;
  }

  const { error: winError } = await getSupabase()
    .from("books")
    .update({ status: "current" })
    .eq("id", winnerId);
  if (winError) throw new Error(winError.message);

  const loserIds = [...bookIds].filter((id) => id !== winnerId);
  if (loserIds.length > 0) {
    const { error: loseError } = await getSupabase()
      .from("books")
      .update({ status: "rejected" })
      .in("id", loserIds);
    if (loseError) throw new Error(loseError.message);
  }

  const { error: roundError } = await getSupabase()
    .from("rounds")
    .update({ status: "closed" })
    .eq("id", roundId);
  if (roundError) throw new Error(roundError.message);

  revalidatePath("/");
  revalidatePath("/vote");
}

// --- Current book -----------------------------------------------------------

export async function submitScore(formData: FormData): Promise<void> {
  const memberId = await requireMemberId();
  const bookId = nonEmpty(formData, "bookId");
  const scoreRaw = nonEmpty(formData, "score");
  if (!bookId || !scoreRaw) throw new Error("Missing score.");

  const score = Math.round(Number(scoreRaw) * 10) / 10;
  if (!Number.isFinite(score) || score < 1 || score > 10) {
    throw new Error("Score must be between 1 and 10.");
  }

  const { error } = await getSupabase()
    .from("scores")
    .upsert({ book_id: bookId, member_id: memberId, score }, { onConflict: "book_id,member_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/past");
}

export async function markFinished(formData: FormData): Promise<void> {
  const bookId = nonEmpty(formData, "bookId");
  const dateDiscussed = nonEmpty(formData, "dateDiscussed");
  if (!bookId || !dateDiscussed) throw new Error("Missing book or date.");

  const { error } = await getSupabase()
    .from("books")
    .update({ status: "past", date_discussed: dateDiscussed })
    .eq("id", bookId)
    .eq("status", "current");
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/past");
}
