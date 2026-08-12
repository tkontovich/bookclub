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
import { average, formatDate } from "@/lib/util";
import { BookCover } from "@/components/BookCover";
import { StartBookForm } from "@/components/StartBookForm";
import { PastBooksList, type PastBookView } from "@/components/PastBooksList";
import { ScoreRows, type ScoreEntry } from "@/components/ScoreRows";

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
    <div>
      {/* Full-bleed band, content still centred at max-w-3xl. */}
      <section className="band w-full">
        <div className="mx-auto max-w-3xl space-y-4 p-4 py-8">
          {!book ? (
            <>
              <SectionHeading>Start the next book</SectionHeading>
              <StartBookForm members={activeMembers} />
            </>
          ) : (
            <CurrentBook
              book={book}
              settings={settings}
              activeMembers={activeMembers}
              memberMap={memberMap}
            />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 p-4 pt-8">
        <SectionHeading>Past Books</SectionHeading>
        <PastBooksList books={pastBookViews} />
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl uppercase leading-none text-term-bright">
      <span className="text-term-dim">&gt;</span> {children}
    </h2>
  );
}

// Label ......................... value
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label shrink-0">{label}</span>
      <span className="-translate-y-1 flex-1 border-b border-dotted border-term-fg/30" />
      <span className="shrink-0 text-sm text-term-bright">{value}</span>
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
  const recorded = activeMembers.filter((m) => scoreByMember.has(m.id)).length;

  const existing: Record<string, ScoreEntry> = {};
  for (const s of scores) existing[s.member_id] = { score: s.score, absent: s.absent };

  return (
    <>
      <SectionHeading>Now Reading</SectionHeading>

      <div className="panel">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="w-32 shrink-0">
            <BookCover src={book.cover_url} alt={book.title} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="font-display text-4xl leading-none text-term-bright">{book.title}</h1>
            <div className="space-y-1.5">
              {book.author && <Row label="Author" value={book.author} />}
              <Row label="Picked by" value={picker?.name ?? "Unknown"} />
              <Row label="Next meeting" value={formatDate(settings.next_meeting_date)} />
              <Row
                label="Average"
                value={
                  avg !== null ? (
                    <span className="font-display text-xl text-term-green">{avg.toFixed(1)}</span>
                  ) : (
                    <span className="text-term-dim">--</span>
                  )
                }
              />
            </div>
          </div>
        </div>

        <details className="disclosure border-t border-term-fg/25">
          <summary className="label px-5 py-3 hover:text-term-fg">
            <span>
              Score entry
              <span className="ml-2 text-term-dim/70">
                {recorded} / {activeMembers.length} recorded
              </span>
            </span>
          </summary>
          <div className="space-y-3 px-5 pb-5">
            <p className="text-xs text-term-dim">
              Record everyone&apos;s score as you discuss, or mark them absent if they didn&apos;t
              make it.
            </p>
            <form action={saveScores} className="space-y-2">
              <input type="hidden" name="bookId" value={book.id} />
              <ScoreRows members={activeMembers} existing={existing} />
              <button type="submit" className="btn btn-primary mt-2">
                Save scores
              </button>
            </form>
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3 border-t border-term-fg/25 px-5 py-3">
          <span className="label">Finished?</span>
          <form action={lockBook}>
            <input type="hidden" name="bookId" value={book.id} />
            <button type="submit" className="btn">
              Lock &amp; archive
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
