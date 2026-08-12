import { getSupabase } from "./supabase";
import type { Book, ClubSettings, Member, Round, Score, Vote } from "./types";

// Plain, unjoined queries - names are resolved in the UI layer via
// getMemberMap() rather than relying on PostgREST embedding. With only a
// handful of members this keeps the query surface small and easy to reason
// about.

export async function getAllMembers(): Promise<Member[]> {
  const { data, error } = await getSupabase().from("members").select("*").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getActiveMembers(): Promise<Member[]> {
  const members = await getAllMembers();
  return members.filter((m) => m.active);
}

export async function getMemberMap(): Promise<Map<string, Member>> {
  const members = await getAllMembers();
  return new Map(members.map((m) => [m.id, m]));
}

export async function getClubSettings(): Promise<ClubSettings> {
  const { data, error } = await getSupabase()
    .from("club_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrentBook(): Promise<Book | null> {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("status", "current")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPastBooks(): Promise<Book[]> {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("status", "past")
    .order("date_discussed", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getScoresForBooks(bookIds: string[]): Promise<Score[]> {
  if (bookIds.length === 0) return [];
  const { data, error } = await getSupabase().from("scores").select("*").in("book_id", bookIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getScoresForBook(bookId: string): Promise<Score[]> {
  return getScoresForBooks([bookId]);
}

export async function getOpenRound(): Promise<Round | null> {
  const { data, error } = await getSupabase()
    .from("rounds")
    .select("*")
    .eq("status", "open")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getBooksForRound(roundId: string): Promise<Book[]> {
  const { data, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getVotesForRound(roundId: string): Promise<Vote[]> {
  const { data, error } = await getSupabase().from("votes").select("*").eq("round_id", roundId);
  if (error) throw new Error(error.message);
  return data ?? [];
}
