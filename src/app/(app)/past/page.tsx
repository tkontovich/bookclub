import { getMemberMap, getPastBooks, getScoresForBooks } from "@/lib/data";
import { average, formatDate } from "@/lib/util";
import { BookCover } from "@/components/BookCover";

export default async function PastBooksPage() {
  const [books, memberMap] = await Promise.all([getPastBooks(), getMemberMap()]);
  const scores = await getScoresForBooks(books.map((b) => b.id));

  if (books.length === 0) {
    return <p className="text-neutral-500">No books finished yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Past Books</h1>
      <ul className="space-y-4">
        {books.map((book) => {
          const bookScores = scores.filter((s) => s.book_id === book.id);
          const avg = average(bookScores.map((s) => s.score));
          const picker = memberMap.get(book.picker_id);

          return (
            <li
              key={book.id}
              className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="w-20 shrink-0">
                <BookCover src={book.cover_url} alt={book.title} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="font-medium">{book.title}</h2>
                {book.author && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{book.author}</p>
                )}
                <p className="text-sm text-neutral-500">Picked by {picker?.name ?? "Unknown"}</p>
                <p className="text-sm text-neutral-500">
                  Discussed {formatDate(book.date_discussed)}
                </p>
                {avg !== null && (
                  <p className="text-sm font-medium">Average score: {avg.toFixed(1)}</p>
                )}
                {bookScores.length > 0 && (
                  <details className="pt-1 text-sm">
                    <summary className="cursor-pointer text-neutral-500">
                      Scores ({bookScores.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {bookScores.map((s) => (
                        <li key={s.id} className="flex justify-between">
                          <span>{memberMap.get(s.member_id)?.name ?? "Unknown"}</span>
                          <span className="tabular-nums">{s.score.toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
