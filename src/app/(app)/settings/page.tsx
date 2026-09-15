import { redirect } from "next/navigation";
import {
  getAllMembers,
  getCalendarInvite,
  getClubSettings,
  getCurrentBook,
  getGoogleCredentials,
  getPastBooks,
  getScoresForBooks,
} from "@/lib/data";
import { PastBooksAdmin, type BookAdminView } from "@/components/PastBooksAdmin";
import { MembersAdmin, type MemberAdminView } from "@/components/MembersAdmin";
import { CalendarSettings } from "@/components/CalendarSettings";
import type { ScoreEntry } from "@/components/ScoreRows";
import { isUnlocked } from "@/lib/session";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  // Settings is edit-only. The nav hides the gear while locked; this catches
  // anyone who goes to the URL directly.
  if (!(await isUnlocked())) redirect("/login?returnTo=/settings");

  const [allMembers, currentBook, pastBooks, settings, credentials, params] = await Promise.all([
    getAllMembers(),
    getCurrentBook(),
    getPastBooks(),
    getClubSettings(),
    getGoogleCredentials(),
    searchParams,
  ]);

  // The book being read now sits at the top of the same edit list.
  const books = [...(currentBook ? [currentBook] : []), ...pastBooks];
  const [scores, invite] = await Promise.all([
    getScoresForBooks(books.map((b) => b.id)),
    currentBook ? getCalendarInvite(currentBook.id) : Promise.resolve(null),
  ]);

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

  const memberViews: MemberAdminView[] = allMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    active: m.active,
  }));
  const activeMembers = allMembers.filter((m) => m.active);
  const invitableCount = activeMembers.filter((m) => m.email && m.email.trim() !== "").length;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
        <span className="text-term-dim">&gt;</span> Settings
      </h1>

      <section className="panel space-y-3 p-5">
        <h2 className="label text-term-fg">Members</h2>
        <MembersAdmin members={memberViews} />
      </section>

      <CalendarSettings
        connected={credentials !== null}
        connectedEmail={credentials?.connected_email ?? null}
        startTime={settings.meeting_start_time.slice(0, 5)}
        durationMinutes={settings.meeting_duration_minutes}
        nextMeetingDate={settings.next_meeting_date}
        bookTitle={currentBook?.title ?? null}
        bookId={currentBook?.id ?? null}
        invite={invite}
        invitableCount={invitableCount}
        memberCount={activeMembers.length}
        banner={params.google}
      />

      <section className="panel space-y-3 p-5">
        <PastBooksAdmin
          books={adminBooks}
          members={allMembers}
          canEdit
          inviteSent={invite?.status === "sent"}
        />
      </section>
    </div>
  );
}
