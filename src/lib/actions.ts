"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabase } from "./supabase";
import { getActiveMembers, getAllMembers, getClubSettings, getCurrentBook } from "./data";
import { searchForBooks } from "./book-search";
import { SESSION_COOKIE_NAME, isUnlocked } from "./session";
import { todayIsoDate } from "./util";
import type { BookSearchResult, Member } from "./types";

/**
 * Every write goes through here. Server actions are POST endpoints that
 * anyone can call directly, so hiding the edit UI is not a boundary -
 * this check is. Must be the first line of any mutating action.
 */
async function requireUnlocked(): Promise<void> {
  if (!(await isUnlocked())) {
    throw new Error("Editing is locked. Switch edit mode on first.");
  }
}

/** Turns edit mode off. Clearing the cookie re-renders the current page. */
export async function lockSite(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath("/", "layout");
}

function nonEmpty(formData: FormData, field: string): string | null {
  const value = formData.get(field);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type ScoreRow = { book_id: string; member_id: string; absent: boolean; score: number | null };

function buildScoreRows(formData: FormData, members: Member[], bookId: string): ScoreRow[] {
  return members.map((member) => {
    const absent = formData.get(`absent_${member.id}`) === "on";
    const scoreRaw = formData.get(`score_${member.id}`);
    let score: number | null = null;
    if (!absent && typeof scoreRaw === "string" && scoreRaw.trim() !== "") {
      const parsed = Math.round(Number(scoreRaw) * 10) / 10;
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
        throw new Error(`${member.name}'s score must be between 1 and 10.`);
      }
      score = parsed;
    }
    return { book_id: bookId, member_id: member.id, absent, score };
  });
}

// --- Members / settings -----------------------------------------------------

export async function addMember(formData: FormData): Promise<void> {
  await requireUnlocked();
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
  await requireUnlocked();
  const memberId = nonEmpty(formData, "memberId");
  if (!memberId) throw new Error("Missing member.");

  const { error } = await getSupabase().from("members").update({ active: false }).eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
}

// --- Current book -----------------------------------------------------------

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  await requireUnlocked();
  return searchForBooks(query);
}

export async function startCurrentBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const currentBook = await getCurrentBook();
  if (currentBook) {
    throw new Error("Lock the current book before starting a new one.");
  }

  const title = nonEmpty(formData, "title");
  if (!title) throw new Error("Title is required.");

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) throw new Error("Choose who picked this book.");

  const { error } = await getSupabase().from("books").insert({
    title,
    author: nonEmpty(formData, "author"),
    cover_url: nonEmpty(formData, "coverUrl"),
    google_books_id: nonEmpty(formData, "googleBooksId"),
    picker_id: pickerId,
    status: "current",
  });
  if (error) throw new Error(error.message);

  // The meeting date is set alongside the book rather than in settings; it
  // later seeds the "discussed on" date when the book gets archived.
  const { error: settingsError } = await getSupabase()
    .from("club_settings")
    .update({ next_meeting_date: nonEmpty(formData, "nextMeetingDate") })
    .eq("id", true);
  if (settingsError) throw new Error(settingsError.message);

  revalidatePath("/");
}

export async function saveScores(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  const members = await getActiveMembers();
  const rows = buildScoreRows(formData, members, bookId).filter(
    (row) => row.absent || row.score !== null,
  );

  if (rows.length > 0) {
    const { error } = await getSupabase()
      .from("scores")
      .upsert(rows, { onConflict: "book_id,member_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function lockBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  // The meeting date set when the book started is the date it was
  // discussed; it stays correctable from Settings afterwards.
  const settings = await getClubSettings();
  const dateDiscussed = settings.next_meeting_date ?? todayIsoDate();

  const { error } = await getSupabase()
    .from("books")
    .update({ status: "past", date_discussed: dateDiscussed })
    .eq("id", bookId)
    .eq("status", "current");
  if (error) throw new Error(error.message);

  // That meeting has now happened, so the date no longer applies until
  // the next book is started.
  const { error: settingsError } = await getSupabase()
    .from("club_settings")
    .update({ next_meeting_date: null })
    .eq("id", true);
  if (settingsError) throw new Error(settingsError.message);

  revalidatePath("/");
  revalidatePath("/settings");
}

// --- Past books (backfilling history) ---------------------------------------

export async function addPastBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const title = nonEmpty(formData, "title");
  if (!title) throw new Error("Title is required.");

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) throw new Error("Choose who picked this book.");

  const dateDiscussed = nonEmpty(formData, "bookDate");
  if (!dateDiscussed) throw new Error("Discussion date is required.");

  const { data: book, error: bookError } = await getSupabase()
    .from("books")
    .insert({
      title,
      author: nonEmpty(formData, "author"),
      cover_url: nonEmpty(formData, "coverUrl"),
      google_books_id: nonEmpty(formData, "googleBooksId"),
      picker_id: pickerId,
      status: "past",
      date_discussed: dateDiscussed,
    })
    .select("id")
    .single();
  if (bookError || !book) throw new Error(bookError?.message ?? "Could not add the book.");

  const members = await getAllMembers();
  const rows = buildScoreRows(formData, members, book.id).filter(
    (row) => row.absent || row.score !== null,
  );

  if (rows.length > 0) {
    const { error: scoresError } = await getSupabase()
      .from("scores")
      .upsert(rows, { onConflict: "book_id,member_id" });
    if (scoresError) throw new Error(scoresError.message);
  }

  revalidatePath("/");
  revalidatePath("/settings");
}

/**
 * Edits any book from Settings. For an archived book the date is when it
 * was discussed; for the book being read now it's the next meeting date,
 * which lives on club_settings rather than the book row.
 */
export async function updateBook(formData: FormData): Promise<void> {
  await requireUnlocked();
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  const title = nonEmpty(formData, "title");
  if (!title) throw new Error("Title is required.");

  const pickerId = nonEmpty(formData, "pickerId");
  if (!pickerId) throw new Error("Choose who picked this book.");

  const isCurrent = formData.get("status") === "current";
  const bookDate = nonEmpty(formData, "bookDate");
  if (!isCurrent && !bookDate) throw new Error("Discussion date is required.");

  const { error } = await getSupabase()
    .from("books")
    .update({
      title,
      author: nonEmpty(formData, "author"),
      cover_url: nonEmpty(formData, "coverUrl"),
      google_books_id: nonEmpty(formData, "googleBooksId"),
      picker_id: pickerId,
      ...(isCurrent ? {} : { date_discussed: bookDate }),
    })
    .eq("id", bookId);
  if (error) throw new Error(error.message);

  if (isCurrent) {
    const { error: settingsError } = await getSupabase()
      .from("club_settings")
      .update({ next_meeting_date: bookDate })
      .eq("id", true);
    if (settingsError) throw new Error(settingsError.message);
  }

  // Replace the whole score set so cleared entries actually disappear
  // rather than lingering from the previous save.
  const members = await getAllMembers();
  const rows = buildScoreRows(formData, members, bookId).filter(
    (row) => row.absent || row.score !== null,
  );

  const { error: clearError } = await getSupabase()
    .from("scores")
    .delete()
    .eq("book_id", bookId);
  if (clearError) throw new Error(clearError.message);

  if (rows.length > 0) {
    const { error: insertError } = await getSupabase().from("scores").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/settings");
}
