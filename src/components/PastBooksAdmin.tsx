"use client";

import { useState, useTransition } from "react";
import { addPastBook, updateBook } from "@/lib/actions";
import type { Member } from "@/lib/types";
import { BookCover } from "./BookCover";
import { BookSearchFields } from "./BookSearchFields";
import { DatePicker } from "./DatePicker";
import { ScoreRows, type ScoreEntry } from "./ScoreRows";
import { Modal } from "./Modal";

export type BookAdminView = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  googleBooksId: string | null;
  pickerId: string;
  status: "current" | "past";
  /** Next meeting date for the current book, discussion date for archived. */
  date: string | null;
  scores: Record<string, ScoreEntry>;
};

export function PastBooksAdmin({
  books,
  members,
  canEdit,
  inviteSent = false,
}: {
  books: BookAdminView[];
  members: Member[];
  canEdit: boolean;
  /** Whether the current book already has a calendar invite out. */
  inviteSent?: boolean;
}) {
  // `null` = closed, `"new"` = add modal, otherwise the book being edited.
  const [target, setTarget] = useState<BookAdminView | "new" | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label text-term-fg">Books</h2>
        {canEdit && (
          <button type="button" onClick={() => setTarget("new")} className="btn btn-primary">
            + Add past book
          </button>
        )}
      </div>

      {books.length === 0 ? (
        <p className="label">No books yet.</p>
      ) : (
        <ul className="divide-y divide-term-fg/20 border border-term-fg/25">
          {books.map((book) => (
            <li key={book.id} className="flex items-center gap-3 p-3">
              <div className="w-8 shrink-0">
                <BookCover src={book.coverUrl} alt={book.title} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-term-bright">
                  {book.title}
                  {book.status === "current" && (
                    <span className="ml-2 whitespace-nowrap text-[0.625rem] uppercase tracking-widest text-term-green">
                      Now reading
                    </span>
                  )}
                </p>
                {book.author && <p className="label truncate">{book.author}</p>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setTarget(book)}
                  className="label shrink-0 hover:text-term-fg"
                >
                  [ Edit ]
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target === "new" ? "Add past book" : "Edit book"}
      >
        {target !== null && (
          <BookForm
            key={target === "new" ? "new" : target.id}
            members={members}
            book={target === "new" ? null : target}
            inviteSent={inviteSent}
            onDone={() => setTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function BookForm({
  members,
  book,
  inviteSent,
  onDone,
}: {
  members: Member[];
  book: BookAdminView | null;
  inviteSent: boolean;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCurrent = book?.status === "current";

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (book) await updateBook(formData);
        else await addPastBook(formData);
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save that book.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {book && (
        <>
          <input type="hidden" name="bookId" value={book.id} />
          <input type="hidden" name="status" value={book.status} />
        </>
      )}

      <BookSearchFields
        initialTitle={book?.title ?? ""}
        initialAuthor={book?.author ?? ""}
        initialCoverUrl={book?.coverUrl ?? ""}
        initialGoogleBooksId={book?.googleBooksId ?? ""}
      >
        <select name="pickerId" required defaultValue={book?.pickerId ?? ""} className="w-full">
          <option value="" disabled>
            PICKED BY…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="space-y-1.5">
          <span className="label block">{isCurrent ? "Next meeting" : "Discussed on"}</span>
          <DatePicker name="bookDate" defaultValue={book?.date ?? ""} required={!isCurrent} />
          {isCurrent && inviteSent && (
            <p className="text-xs text-term-dim">
              Changing the date moves the existing invite, and Google emails everyone the update.
            </p>
          )}
        </div>
      </BookSearchFields>

      <fieldset className="panel space-y-2 p-4">
        <legend className="label px-1">Scores</legend>
        <ScoreRows members={members} existing={book?.scores ?? {}} />
      </fieldset>

      {error && (
        <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
          ! {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn btn-primary">
          {isPending ? "Saving…" : book ? "Save changes" : "Add book"}
        </button>
        <button type="button" onClick={onDone} className="btn">
          Cancel
        </button>
      </div>
    </form>
  );
}
