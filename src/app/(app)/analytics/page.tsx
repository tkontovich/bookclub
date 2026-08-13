import { buildAnalytics, type BookStat } from "@/lib/analytics";
import { getAllMembers, getAllBooks, getScoresForBooks } from "@/lib/data";
import { BarChart } from "@/components/BarChart";

export default async function AnalyticsPage() {
  const [members, books] = await Promise.all([getAllMembers(), getAllBooks()]);
  const scores = await getScoresForBooks(books.map((b) => b.id));
  const a = buildAnalytics(books, scores, members);

  const best = a.ranked.slice(0, 5);
  const worst = a.ranked.slice(-5).reverse();
  const maxBucket = Math.max(1, ...a.distribution.map((d) => d.count));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="font-display text-3xl uppercase leading-none text-term-bright">
        <span className="text-term-dim">&gt;</span> Analytics
      </h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Club average" value={a.clubAverage?.toFixed(2) ?? "--"} accent />
        <Stat label="Books scored" value={`${a.booksScored}/${a.booksTotal}`} />
        <Stat label="Ratings given" value={String(a.ratingsGiven)} />
        <Stat label="Members" value={String(members.length)} />
      </section>

      <Panel
        title="Average rating by picker"
        blurb="How the books each person chose were received."
      >
        <BarChart
          data={a.perPicker.map((p) => ({
            label: p.name,
            value: p.average,
            note: `n=${p.count}`,
          }))}
          max={10}
          reference={a.clubAverage}
          referenceLabel={`Club average ${a.clubAverage?.toFixed(2) ?? "--"}`}
        />
        <p className="label mt-3 leading-relaxed">
          n = scored books that person picked. Most are 1&ndash;2, so treat the order as
          trivia rather than a verdict &mdash; one dud moves a whole column.
        </p>
      </Panel>

      <Panel
        title="Average rating given"
        blurb="Who runs generous and who runs harsh."
      >
        <BarChart
          data={a.perGiver.map((g) => ({
            label: g.name,
            value: g.average,
            note: `n=${g.count}`,
          }))}
          max={10}
          reference={a.clubAverage}
          referenceLabel={`Club average ${a.clubAverage?.toFixed(2) ?? "--"}`}
        />
      </Panel>

      <Panel title="Where the ratings land" blurb="Every rating ever given, by whole point.">
        <BarChart
          data={a.distribution.map((d) => ({
            label: `${d.bucket}-${d.bucket + 1}`,
            value: d.count,
          }))}
          max={maxBucket}
          decimals={0}
        />
      </Panel>

      <Panel
        title="Most divisive"
        blurb="Widest spread of opinion, books with 3+ ratings."
      >
        <BookTable
          rows={a.divisive.slice(0, 5)}
          metric={(b) => `±${b.spread.toFixed(2)}`}
        />
      </Panel>

      <div className="grid gap-8 sm:grid-cols-2">
        <Panel title="Best received">
          <BookTable rows={best} metric={(b) => b.average.toFixed(2)} />
        </Panel>
        <Panel title="Worst received">
          <BookTable rows={worst} metric={(b) => b.average.toFixed(2)} />
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="panel p-3">
      <p className="label">{label}</p>
      <p
        className={`font-display text-3xl leading-none ${
          accent ? "text-term-green" : "text-term-bright"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0 so long book titles truncate instead of forcing the panel
    // wider than its grid column.
    <section className="panel min-w-0 space-y-3 p-5">
      <div>
        <h2 className="label text-term-fg">{title}</h2>
        {blurb && <p className="mt-1 text-xs text-term-dim">{blurb}</p>}
      </div>
      {children}
    </section>
  );
}

function BookTable({
  rows,
  metric,
}: {
  rows: BookStat[];
  metric: (row: BookStat) => string;
}) {
  if (rows.length === 0) return <p className="label">Not enough data yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.id} className="flex items-baseline gap-2">
          <span className="min-w-0 shrink truncate text-sm text-term-bright">{row.title}</span>
          <span className="-translate-y-1 flex-1 border-b border-dotted border-term-fg/30" />
          <span className="shrink-0 text-sm tabular-nums text-term-fg">
            {metric(row)}
          </span>
          <span className="label w-8 shrink-0 text-right tabular-nums">n={row.count}</span>
        </li>
      ))}
    </ul>
  );
}
