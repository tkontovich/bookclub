export type BarDatum = {
  label: string;
  value: number;
  /** Sample size or similar caveat, rendered next to the value. */
  note?: string;
};

/**
 * Horizontal bars, one series, one hue. Every bar is directly labelled with
 * its value, so nothing is hidden behind a hover and the chart doubles as
 * its own table. `max` is passed explicitly rather than derived from the
 * data so rating charts sit on the true 0-10 scale instead of a truncated
 * axis that would exaggerate the gaps.
 */
export function BarChart({
  data,
  max,
  reference,
  referenceLabel,
  decimals = 1,
}: {
  data: BarDatum[];
  max: number;
  reference?: number | null;
  referenceLabel?: string;
  decimals?: number;
}) {
  if (data.length === 0) {
    return <p className="label">Not enough data yet.</p>;
  }

  const referencePct =
    reference != null && max > 0 ? Math.min(100, (reference / max) * 100) : null;

  return (
    <div>
      {referencePct !== null && referenceLabel && (
        <p className="label mb-2">
          <span className="mr-1 inline-block h-0 w-4 border-t border-dashed border-term-fg/70 align-middle" />
          {referenceLabel}
        </p>
      )}

      <div>
        {data.map((d) => {
          const pct = max > 0 ? Math.min(100, (d.value / max) * 100) : 0;
          return (
            <div key={d.label} className="group flex items-center gap-3 py-1">
              <span className="w-20 shrink-0 truncate text-xs uppercase tracking-wider text-term-fg">
                {d.label}
              </span>

              <div className="relative h-5 flex-1 bg-term-fg/[0.06]">
                <div
                  className="absolute inset-y-0 left-0 rounded-r-[3px] bg-term-fg/70 transition-[background-color] group-hover:bg-term-bright"
                  style={{ width: `${pct}%` }}
                />
                {referencePct !== null && (
                  <div
                    className="absolute -top-1 -bottom-1 border-l border-dashed border-term-fg/70"
                    style={{ left: `${referencePct}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>

              <span className="w-9 shrink-0 text-right text-sm tabular-nums text-term-bright">
                {d.value.toFixed(decimals)}
              </span>
              {d.note && (
                <span className="label w-10 shrink-0 text-right tabular-nums">{d.note}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
