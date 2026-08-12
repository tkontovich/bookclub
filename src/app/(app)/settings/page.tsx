import { addMember, removeMember } from "@/lib/actions";
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

export default async function SettingsPage() {
  const [allMembers, currentBook, pastBooks, settings, canEdit] = await Promise.all([
    getAllMembers(),
    getCurrentBook(),
    getPastBooks(),
    getClubSettings(),
    isUnlocked(),
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

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
        <span className="text-term-dim">&gt;</span> Settings
      </h1>

      <section className="panel space-y-3 p-5">
        <h2 className="label text-term-fg">Members</h2>
        <ul className="space-y-1">
          {allMembers.map((m) => (
            <li key={m.id} className="flex items-baseline gap-2">
              <span
                className={
                  m.active
                    ? "shrink-0 text-sm uppercase tracking-wider text-term-bright"
                    : "shrink-0 text-sm uppercase tracking-wider text-term-dim line-through"
                }
              >
                {m.name}
              </span>
              <span className="-translate-y-1 flex-1 border-b border-dotted border-term-fg/30" />
              {canEdit && m.active && (
                <form action={removeMember} className="shrink-0">
                  <input type="hidden" name="memberId" value={m.id} />
                  <button type="submit" className="label hover:text-term-fg">
                    [ Remove ]
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addMember} className="flex flex-wrap items-center gap-2 pt-2">
            <input type="text" name="name" placeholder="NEW MEMBER NAME" required />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>
        )}
      </section>

      <section className="panel space-y-3 p-5">
        <PastBooksAdmin books={adminBooks} members={allMembers} canEdit={canEdit} />
      </section>
    </div>
  );
}
