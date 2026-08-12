import { lockBook, saveScores } from "@/lib/actions";
import { getActiveMembers, getClubSettings, getCurrentBook, getMemberMap, getScoresForBook } from "@/lib/data";
import { average, formatDate, todayIsoDate } from "@/lib/util";
import { BookCover } from "@/components/BookCover";
import { StartBookForm } from "@/components/StartBookForm";

export default async function CurrentBookPage() {
  const [book, settings, activeMembers, memberMap] = await Promise.all([
    getCurrentBook(),
    getClubSettings(),
    getActiveMembers(),
    getMemberMap(),
  ]);

  if (!book) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Start the next book</h1>
        <StartBookForm members={activeMembers} />
      </div>
    );
  }

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
          {book.description && (
            <p className="pt-2 text-sm text-neutral-700 dark:text-neutral-300">
              {book.description}
            </p>
          )}
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
