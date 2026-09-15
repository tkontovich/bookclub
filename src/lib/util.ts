export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "19:00:00" -> "7:00 PM". Accepts "HH:MM" or "HH:MM:SS". */
export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "19:00" + 120 minutes -> "7:00–9:00 PM", keeping both suffixes if they differ. */
export function formatMeetingRange(time: string, durationMinutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const endTotal = (((h * 60 + m + durationMinutes) % 1440) + 1440) % 1440;
  const end = `${String(Math.floor(endTotal / 60)).padStart(2, "0")}:${String(
    endTotal % 60,
  ).padStart(2, "0")}`;
  const [startText, startSuffix] = formatTimeOfDay(time).split(" ");
  const [endText, endSuffix] = formatTimeOfDay(end).split(" ");
  return startSuffix === endSuffix
    ? `${startText}–${endText} ${endSuffix}`
    : `${startText} ${startSuffix}–${endText} ${endSuffix}`;
}
