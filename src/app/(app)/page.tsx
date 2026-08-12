import { cookies } from "next/headers";
import Link from "next/link";
import { markFinished, submitScore } from "@/lib/actions";
import { getClubSettings, getCurrentBook, getMemberMap, getScoresForBook } from "@/lib/data";
import { MEMBER_COOKIE_NAME } from "@/lib/session";
import { average, formatDate, todayIsoDate } from "@/lib/util";
import { BookCover } from "@/components/BookCover";

export default async function CurrentBookPage() {
  const [book, settings, memberMap, cookieStore] = await Promise.all([
    getCurrentBook(),
    getClubSettings(),
    getMemberMap(),
    cookies(),
  ]);
  const currentMemberId = cookieStore.get(MEMBER_COOKIE_NAME)?.value ?? null;

  if (!book) {
    return (
      <div className="space-y-3 rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-800">
        <p className="text-neutral-600 dark:text-neutral-400">
          No book is currently being read.
        </p>
        <Link href="/vote" className="text-sm font-medium underline">
          Propose or vote on the next book →
        </Link>
      </div>
    );
  }

  const scores = await getScoresForBook(book.id);
  const avg = average(scores.map((s) => s.score));
  const myScore = currentMemberId
    ? scores.find((s) => s.member_id === currentMemberId)?.score
    : undefined;
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

      <section className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Scores</h2>
        {scores.length === 0 ? (
          <p className="text-sm text-neutral-500">No scores yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {scores.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{memberMap.get(s.member_id)?.name ?? "Unknown"}</span>
                <span className="tabular-nums">{s.score.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
        {avg !== null && (
          <p className="border-t border-neutral-200 pt-2 text-sm font-medium dark:border-neutral-800">
            Average: {avg.toFixed(1)}
          </p>
        )}

        {currentMemberId ? (
          <form action={submitScore} className="flex items-center gap-2 pt-2">
            <input type="hidden" name="bookId" value={book.id} />
            <input
              type="number"
              name="score"
              min={1}
              max={10}
              step={0.1}
              defaultValue={myScore}
              required
              placeholder="Your score"
              className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {myScore !== undefined ? "Update score" : "Submit score"}
            </button>
          </form>
        ) : (
          <p className="pt-2 text-sm text-neutral-500">
            Select who you are at the top of the page to leave a score.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="font-medium">Finished discussing?</h2>
        <form action={markFinished} className="flex flex-wrap items-center gap-2">
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
            Move to Past Books
          </button>
        </form>
      </section>
    </div>
  );
}
