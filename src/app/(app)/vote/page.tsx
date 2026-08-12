import { cookies } from "next/headers";
import { castVote, closeRound } from "@/lib/actions";
import {
  getActiveMembers,
  getBooksForRound,
  getClubSettings,
  getMemberMap,
  getOpenRound,
  getVotesForRound,
} from "@/lib/data";
import { MEMBER_COOKIE_NAME } from "@/lib/session";
import { BookCover } from "@/components/BookCover";
import { ProposeBooksForm } from "@/components/ProposeBooksForm";

export default async function VotePage() {
  const [openRound, memberMap, activeMembers, cookieStore] = await Promise.all([
    getOpenRound(),
    getMemberMap(),
    getActiveMembers(),
    cookies(),
  ]);
  const currentMemberId = cookieStore.get(MEMBER_COOKIE_NAME)?.value ?? null;

  if (!openRound) {
    const settings = await getClubSettings();
    const picker = settings.next_picker_id ? memberMap.get(settings.next_picker_id) : null;

    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Propose the next book</h1>
        {picker ? (
          <>
            <p className="text-sm text-neutral-500">
              Proposing as <span className="font-medium">{picker.name}</span> (set in Settings).
            </p>
            <ProposeBooksForm />
          </>
        ) : (
          <p className="text-neutral-500">
            No one is set to pick next. Set the next picker in{" "}
            <a href="/settings" className="underline">
              Settings
            </a>{" "}
            first.
          </p>
        )}
      </div>
    );
  }

  const [books, votes] = await Promise.all([
    getBooksForRound(openRound.id),
    getVotesForRound(openRound.id),
  ]);
  const picker = memberMap.get(openRound.picker_id);

  const votesByBook = new Map<string, number>();
  for (const book of books) votesByBook.set(book.id, 0);
  for (const vote of votes) {
    votesByBook.set(vote.book_id, (votesByBook.get(vote.book_id) ?? 0) + 1);
  }
  const myVote = currentMemberId ? votes.find((v) => v.member_id === currentMemberId) : undefined;
  const counts = [...votesByBook.values()];
  const isTie = votes.length > 0 && counts.length === 2 && counts[0] === counts[1];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vote for the next book</h1>
        <p className="text-sm text-neutral-500">Proposed by {picker?.name ?? "Unknown"}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {books.map((book) => {
          const count = votesByBook.get(book.id) ?? 0;
          const isMine = myVote?.book_id === book.id;
          return (
            <div
              key={book.id}
              className={`space-y-2 rounded-lg border p-4 ${
                isMine
                  ? "border-neutral-900 dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="w-24">
                <BookCover src={book.cover_url} alt={book.title} />
              </div>
              <h2 className="font-medium">{book.title}</h2>
              {book.author && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{book.author}</p>
              )}
              {book.description && (
                <p className="line-clamp-4 text-sm text-neutral-700 dark:text-neutral-300">
                  {book.description}
                </p>
              )}
              <p className="text-sm font-medium">
                {count} vote{count === 1 ? "" : "s"}
              </p>
              <form action={castVote}>
                <input type="hidden" name="roundId" value={openRound.id} />
                <input type="hidden" name="bookId" value={book.id} />
                <button
                  type="submit"
                  disabled={!currentMemberId}
                  className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {isMine ? "Voted ✓" : "Vote for this one"}
                </button>
              </form>
            </div>
          );
        })}
      </div>

      {!currentMemberId && (
        <p className="text-sm text-neutral-500">
          Select who you are at the top of the page to vote.
        </p>
      )}

      <section className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">
          {votes.length} of {activeMembers.length} members have voted.
        </p>

        {votes.length === 0 ? (
          <p className="text-sm text-neutral-500">No votes yet.</p>
        ) : isTie ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">It&apos;s a tie — decide together, then pick one:</p>
            <div className="flex flex-wrap gap-2">
              {books.map((book) => (
                <form key={book.id} action={closeRound}>
                  <input type="hidden" name="roundId" value={openRound.id} />
                  <input type="hidden" name="winnerBookId" value={book.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {book.title} wins
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : (
          <form action={closeRound}>
            <input type="hidden" name="roundId" value={openRound.id} />
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Close voting
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
