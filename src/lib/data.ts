import { cache } from "react";
import { getSupabase } from "./supabase";
import type { Book, ClubSettings, Member, Score } from "./types";

// Plain, unjoined queries - names are resolved in the UI layer via
// getMemberMap() rather than relying on PostgREST embedding. With only a
// handful of members this keeps the query surface small and easy to reason
// about.
//
// The no-argument readers are wrapped in React's `cache()`, which memoises
// them for the duration of a single render. Several get called from more
// than one place per page - getActiveMembers() and getMemberMap() both want
// the member list - and without this each caller issues its own query. This
// is per-request only, so it never serves stale data across requests.

export const getAllMembers = cache(async (): Promise<Member[]> => {
  const { data, error } = await getSupabase().from("members").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export async function getActiveMembers(): Promise<Member[]> {
  const members = await getAllMembers();
  return members.filter((m) => m.active);
}

export async function getMemberMap(): Promise<Map<string, Member>> {
  const members = await getAllMembers();
  return new Map(members.map((m) => [m.id, m]));
}

export const getClubSettings = cache(async (): Promise<ClubSettings> => {
  const { data, error } = await getSupabase()
    .from("club_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);
  return data;
});

export const getCurrentBook = cache(async (): Promise<Book | null> => {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("status", "current")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export const getPastBooks = cache(async (): Promise<Book[]> => {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("status", "past")
    .order("date_discussed", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Every book regardless of status - used for whole-club analytics. */
export const getAllBooks = cache(async (): Promise<Book[]> => {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .order("date_discussed", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Not memoised: the array argument is a fresh reference on every call, so
// cache() could never hit. Callers should fetch one batch and split it.
export async function getScoresForBooks(bookIds: string[]): Promise<Score[]> {
  if (bookIds.length === 0) return [];
  const { data, error } = await getSupabase().from("scores").select("*").in("book_id", bookIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
