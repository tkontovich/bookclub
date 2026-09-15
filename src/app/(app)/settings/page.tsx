import { redirect } from "next/navigation";
import {
  getAllMembers,
  getClubSettings,
  getCurrentBook,
  getPastBooks,
  getScoresForBooks,
} from "@/lib/data";
import { PastBooksAdmin, type BookAdminView } from "@/components/PastBooksAdmin";
import type { ScoreEntry } from "@/components/ScoreRows";
import { isUnlocked } from "@/lib/session";
import { CalendarSettingsPanel } from "@/components/mock/CalendarMock";
import { MembersMock } from "@/components/mock/MembersMock";

export default async function SettingsPage() {
  // Settings is edit-only. The nav hides the gear while locked; this catches
  // anyone who goes to the URL directly.
  if (!(await isUnlocked())) redirect("/login?returnTo=/settings");

  const [allMembers, currentBook, pastBooks, settings] = await Promise.all([
    getAllMembers(),
    getCurrentBook(),
    getPastBooks(),
    getClubSettings(),
  ]);

  // The book being read now sits at the top of the same edit list.
  const books = [...(currentBook ? [currentBook] : []), ...pastBooks];
  const scores = await getScoresForBooks(books.map((b) => b.id));

  const adminBooks: BookAdminView[] = books.map((b) => {
    const byMember: Record<string, ScoreEntry> = {};
    for (const s of scores) {
      if (s.book_id === b.id) byMember[s.member_id] = { score: s.score, absent: s.absent };
    }
    const isCurrent = b.status === "current";
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url,
      googleBooksId: b.google_books_id,
      pickerId: b.picker_id,
      status: isCurrent ? "current" : "past",
      date: isCurrent ? settings.next_meeting_date : b.date_discussed,
      scores: byMember,
    };
  });

  const activeMembers = allMembers
    .filter((m) => m.active)
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
        <span className="text-term-dim">&gt;</span> Settings
      </h1>

      <section className="panel space-y-3 p-5">
        <h2 className="label text-term-fg">Members</h2>
        <MembersMock members={allMembers} />
      </section>

      <CalendarSettingsPanel
        members={activeMembers}
        bookTitle={currentBook?.title ?? null}
        nextMeetingDate={settings.next_meeting_date}
      />

      <section className="panel space-y-3 p-5">
        <PastBooksAdmin books={adminBooks} members={allMembers} canEdit />
      </section>
    </div>
  );
}
