"use client";

// MOCK ONLY - fake Google Calendar state kept in localStorage so the UI can
// be previewed without a real Google connection or any database changes.
import { useSyncExternalStore } from "react";

export type InviteStatus = "none" | "sent" | "failed";

export type MockCalendarState = {
  connected: boolean;
  invite: InviteStatus;
  /** 24h "HH:MM" */
  startTime: string;
  durationMinutes: number;
  /** Member id -> email, only for emails edited in the mock. */
  emails: Record<string, string>;
  /** Member id -> renamed first name. */
  names: Record<string, string>;
  removedIds: string[];
  added: { id: string; name: string }[];
};

const KEY = "mock-calendar";
const DEFAULT: MockCalendarState = {
  connected: true,
  invite: "sent",
  startTime: "19:00",
  durationMinutes: 120,
  emails: {},
  names: {},
  removedIds: [],
  added: [],
};

let cached: MockCalendarState | null = null;
const listeners = new Set<() => void>();

function read(): MockCalendarState {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    cached = DEFAULT;
  }
  return cached!;
}

function emit() {
  listeners.forEach((l) => l());
}

export function setMock(patch: Partial<MockCalendarState>) {
  cached = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {}
  emit();
}

export function resetMock() {
  cached = DEFAULT;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMock() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}

/**
 * Fake emails so the preview looks populated. One member (the highest id)
 * is left blank to show what a missing email looks like.
 */
export function emailFor(
  state: MockCalendarState,
  member: { id: string; name: string },
  activeIds: string[],
): string {
  if (member.id in state.emails) return state.emails[member.id];
  const lastId = [...activeIds].sort().at(-1);
  if (member.id === lastId) return "";
  return `${member.name.toLowerCase().replace(/[^a-z]/g, "")}@example.com`;
}

export function inviteeCount(state: MockCalendarState, members: { id: string; name: string }[]) {
  const ids = members.map((m) => m.id);
  return members.filter((m) => emailFor(state, m, ids) !== "").length;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function clock(totalMinutes: number) {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { text: `${h12}:${String(mins % 60).padStart(2, "0")}`, ampm: h24 < 12 ? "AM" : "PM" };
}

export function formatTime(hhmm: string) {
  const c = clock(toMinutes(hhmm));
  return `${c.text} ${c.ampm}`;
}

/** "7:00–9:00 PM", or "11:00 AM–1:00 PM" when it crosses noon. */
export function formatTimeRange(hhmm: string, durationMinutes: number) {
  const start = clock(toMinutes(hhmm));
  const end = clock(toMinutes(hhmm) + durationMinutes);
  return start.ampm === end.ampm
    ? `${start.text}–${end.text} ${end.ampm}`
    : `${start.text} ${start.ampm}–${end.text} ${end.ampm}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
