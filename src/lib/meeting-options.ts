// Shared option lists for the meeting-time pickers, used by the settings
// panel and the test invite panel so the two can't drift apart.

/** Every half hour, 8:00 AM to 11:30 PM, as "HH:MM". */
export const START_TIMES = Array.from({ length: 32 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(
    2,
    "0",
  )}`;
});

export const DURATIONS = [60, 90, 120, 150, 180];

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} MIN`;
  return m === 0 ? `${h} HR` : `${h} HR ${m} MIN`;
}
