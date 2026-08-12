import { lockBook, saveScores } from "@/lib/actions";
import {
  getActiveMembers,
  getClubSettings,
  getCurrentBook,
  getMemberMap,
  getPastBooks,
  getScoresForBook,
  getScoresForBooks,
} from "@/lib/data";
import { average, formatDate, todayIsoDate } from "@/lib/util";
import { BookCover } from "@/components/BookCover";
import { StartBookForm } from "@/components/StartBookForm";
import { PastBooksList, type PastBookView } from "@/components/PastBooksList";

export default async function HomePage() {
  const [book, settings, activeMembers, memberMap, pastBooks] = await Promise.all([
    getCurrentBook(),
    getClubSettings(),
    getActiveMembers(),
    getMemberMap(),
    getPastBooks(),
  ]);

  const pastScores = await getScoresForBooks(pastBooks.map((b) => b.id));
  const pastBookViews: PastBookView[] = pastBooks.map((b) => {
    const bookScores = pastScores.filter((s) => s.book_id === b.id);
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      coverUrl: b.cover_url,
      pickerName: memberMap.get(b.picker_id)?.name ?? "Unknown",
      dateDiscussed: b.date_discussed,
      dateDiscussedLabel: formatDate(b.date_discussed),
      average: average(
        bookScores.filter((s) => !s.absent && s.score !== null).map((s) => s.score!),
      ),
      scores: bookScores.map((s) => ({
        memberName: memberMap.get(s.member_id)?.name ?? "Unknown",
        score: s.score,
        absent: s.absent,
      })),
    };
  });

  return (
    <div className="space-y-10">
      <section>
        {!book ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Start the next book</h1>
            <StartBookForm members={activeMembers} />
          </div>
        ) : (
          <CurrentBook
            book={book}
            settings={settings}
            activeMembers={activeMembers}
            memberMap={memberMap}
          />
        )}
      </section>

      <section className="space-y-4 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2 className="text-xl font-semibold">Past Books</h2>
        <PastBooksList books={pastBookViews} />
      </section>
    </div>
  );
}

async function CurrentBook({
  book,
  settings,
  activeMembers,
  memberMap,
}: {
  book: NonNullable<Awaited<ReturnType<typeof getCurrentBook>>>;
  settings: Awaited<ReturnType<typeof getClubSettings>>;
  activeMembers: Awaited<ReturnType<typeof getActiveMembers>>;
  memberMap: Awaited<ReturnType<typeof getMemberMap>>;
}) {
  const scores = await getScoresForBook(book.id);
  const scoreByMember = new Map(scores.map((s) => [s.member_id, s]));
  const avg = average(scores.filter((s) => !s.absent && s.score !== null).map((s) => s.score!));
  const picker = memberMap.get(book.picker_id);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="w-32 shrink-0">
          <BookCover src={book.cover_url} alt={book.title} />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{book.title}</h1>
          {book.author && <p className="text-neutral-600 dark:text-neutral-400">{book.author}</p>}
          <p className="text-sm text-neutral-500">Picked by {picker?.name ?? "Unknown"}</p>
          <p className="text-sm text-neutral-500">
            Next meeting: {formatDate(settings.next_meeting_date)}
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Scores</h2>
        <p className="text-sm text-neutral-500">
          Record everyone&apos;s score as you discuss, or mark them absent if they didn&apos;t
          make it.
        </p>
        <form action={saveScores} className="space-y-2">
          <input type="hidden" name="bookId" value={book.id} />
          {activeMembers.map((member) => {
            const existing = scoreByMember.get(member.id);
            return (
              <div key={member.id} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm">{member.name}</span>
                <input
                  type="number"
                  name={`score_${member.id}`}
                  min={1}
                  max={10}
                  step={0.1}
                  defaultValue={existing?.score ?? ""}
                  placeholder="Score"
                  className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <label className="flex items-center gap-1 text-sm text-neutral-500">
                  <input
                    type="checkbox"
                    name={`absent_${member.id}`}
                    defaultChecked={existing?.absent ?? false}
                  />
                  Absent
                </label>
              </div>
            );
          })}
          <button
            type="submit"
            className="mt-2 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Save scores
          </button>
        </form>
        {avg !== null && (
          <p className="border-t border-neutral-200 pt-2 text-sm font-medium dark:border-neutral-800">
            Average: {avg.toFixed(1)}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Finished discussing?</h2>
        <form action={lockBook} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="bookId" value={book.id} />
          <input
            type="date"
            name="dateDiscussed"
            defaultValue={todayIsoDate()}
            required
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Lock &amp; move to Past Books
          </button>
        </form>
      </section>
    </div>
  );
}
