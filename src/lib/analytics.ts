import type { Book, Member, Score } from "./types";

export type PickerStat = {
  name: string;
  average: number;
  /** Scored books this member picked - the sample behind `average`. */
  count: number;
};

export type GiverStat = {
  name: string;
  average: number;
  /** Ratings this member has given. */
  count: number;
};

export type BookStat = {
  id: string;
  title: string;
  pickerName: string;
  average: number;
  count: number;
  /** Population standard deviation of the ratings - how split the room was. */
  spread: number;
};

export type Analytics = {
  clubAverage: number | null;
  booksTotal: number;
  booksScored: number;
  ratingsGiven: number;
  perPicker: PickerStat[];
  perGiver: GiverStat[];
  distribution: { bucket: number; count: number }[];
  divisive: BookStat[];
  ranked: BookStat[];
};

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/**
 * All derived numbers for the analytics page. Absent rows never count as a
 * rating, and books nobody has scored are excluded from averages entirely
 * rather than being treated as zeroes.
 */
export function buildAnalytics(
  books: Book[],
  scores: Score[],
  members: Member[],
): Analytics {
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const rated = scores.filter(
    (s): s is Score & { score: number } => !s.absent && s.score !== null,
  );

  const byBook = new Map<string, number[]>();
  for (const s of rated) {
    const list = byBook.get(s.book_id);
    if (list) list.push(s.score);
    else byBook.set(s.book_id, [s.score]);
  }

  const bookStats: BookStat[] = books
    .filter((b) => byBook.has(b.id))
    .map((b) => {
      const values = byBook.get(b.id)!;
      return {
        id: b.id,
        title: b.title,
        pickerName: nameById.get(b.picker_id) ?? "Unknown",
        average: mean(values),
        count: values.length,
        spread: stdev(values),
      };
    });

  // Average rating of the books each member chose.
  const pickerBuckets = new Map<string, number[]>();
  for (const stat of bookStats) {
    const list = pickerBuckets.get(stat.pickerName);
    if (list) list.push(stat.average);
    else pickerBuckets.set(stat.pickerName, [stat.average]);
  }
  const perPicker = [...pickerBuckets.entries()]
    .map(([name, averages]) => ({ name, average: mean(averages), count: averages.length }))
    .sort((a, b) => b.average - a.average);

  // Average rating each member hands out.
  const giverBuckets = new Map<string, number[]>();
  for (const s of rated) {
    const name = nameById.get(s.member_id) ?? "Unknown";
    const list = giverBuckets.get(name);
    if (list) list.push(s.score);
    else giverBuckets.set(name, [s.score]);
  }
  const perGiver = [...giverBuckets.entries()]
    .map(([name, values]) => ({ name, average: mean(values), count: values.length }))
    .sort((a, b) => b.average - a.average);

  // Whole-point buckets; a 10 folds into the 9-10 bucket.
  const distribution = Array.from({ length: 10 }, (_, bucket) => ({ bucket, count: 0 }));
  for (const s of rated) {
    const index = Math.min(9, Math.max(0, Math.floor(s.score)));
    distribution[index].count += 1;
  }

  return {
    clubAverage: rated.length > 0 ? mean(rated.map((s) => s.score)) : null,
    booksTotal: books.length,
    booksScored: bookStats.length,
    ratingsGiven: rated.length,
    perPicker,
    perGiver,
    distribution,
    // Needs at least three opinions before "divisive" means anything.
    divisive: [...bookStats].filter((b) => b.count >= 3).sort((a, b) => b.spread - a.spread),
    ranked: [...bookStats].sort((a, b) => b.average - a.average),
  };
}
