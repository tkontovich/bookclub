"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabase } from "./supabase";
import { getActiveMembers, getCurrentBook } from "./data";
import { MEMBER_COOKIE_NAME } from "./session";
import { searchGoogleBooks } from "./google-books";
import type { BookSearchResult } from "./types";

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
  revalidatePath("/");
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

// --- Current book -----------------------------------------------------------

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  return searchGoogleBooks(query);
}

export async function startCurrentBook(formData: FormData): Promise<void> {
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
    description: nonEmpty(formData, "description"),
    google_books_id: nonEmpty(formData, "googleBooksId"),
    picker_id: pickerId,
    status: "current",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function saveScores(formData: FormData): Promise<void> {
  const bookId = nonEmpty(formData, "bookId");
  if (!bookId) throw new Error("Missing book.");

  const members = await getActiveMembers();
  const rows = members.map((member) => {
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

  const toSave = rows.filter((row) => row.absent || row.score !== null);
  if (toSave.length > 0) {
    const { error } = await getSupabase()
      .from("scores")
      .upsert(toSave, { onConflict: "book_id,member_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/past");
}

export async function lockBook(formData: FormData): Promise<void> {
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
