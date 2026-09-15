// MOCK ONLY - shows the "Start the next book" form (normally only visible
// when no book is current) so the invite toggle can be previewed without
// archiving the real current book. Submitting is blocked here: the form's
// real action writes to the live database.
import { getActiveMembers } from "@/lib/data";
import { StartBookForm } from "@/components/StartBookForm";

export default async function MockStartPage() {
  const members = await getActiveMembers();

  return (
    <section className="band w-full">
      <div className="mx-auto max-w-3xl space-y-4 p-4 py-8">
        <h2 className="font-display text-2xl uppercase leading-none text-term-bright">
          <span className="text-term-dim">&gt;</span> Start the next book
        </h2>
        <p className="border border-term-green/50 px-3 py-2 text-xs uppercase tracking-widest text-term-green">
          Preview only · Start this book is disabled on this page
        </p>
        <StartBookForm members={members} previewOnly />
      </div>
    </section>
  );
}
