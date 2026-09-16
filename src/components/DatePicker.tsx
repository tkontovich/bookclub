"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/util";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localToday() {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function monthOf(iso: string) {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}

/**
 * Terminal-styled replacement for <input type="date">, whose popup calendar
 * is drawn by the browser and can't be themed. Submits a plain YYYY-MM-DD
 * value under `name`, so server actions read it exactly as before.
 */
export function DatePicker({
  name,
  id,
  defaultValue = "",
  required = false,
  placeholder = "PICK A DATE…",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => monthOf(defaultValue || localToday()));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Keep Esc from also closing a surrounding <dialog>.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function toggle() {
    if (!open) setView(monthOf(value || localToday()));
    setOpen(!open);
  }

  function shiftMonth(delta: number) {
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function choose(iso: string) {
    setValue(iso);
    setOpen(false);
  }

  const today = localToday();
  const leading = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="date-trigger flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={value ? "text-term-bright" : "text-term-dim"}>
          {value ? formatDate(value) : placeholder}
        </span>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className="shrink-0 text-term-dim"
        >
          <rect x="3.5" y="5" width="17" height="15.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>

      {/* Carries the value into the form and lets `required` block submit.
          Not readOnly - read-only inputs skip constraint validation. */}
      <input
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0"
      />

      {/* A fixed-width popover anchored to a narrow field runs off a phone
          screen, so on small screens the calendar sits against the bottom of
          the viewport instead, where it always fits and is easier to tap.
          From `sm` up it's the usual popover under the field. */}
      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="date-pop fixed inset-x-4 bottom-4 z-30 p-3 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-1 sm:w-72"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="label px-1 py-1 hover:text-term-fg"
            >
              [ &lt; ]
            </button>
            <span className="font-display text-xl uppercase leading-none text-term-bright">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="label px-1 py-1 hover:text-term-fg"
            >
              [ &gt; ]
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="label py-1">
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const iso = isoDate(view.year, view.month, day);
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(iso)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "h-8 bg-term-fg text-sm tabular-nums text-term-bg [text-shadow:none] hover:bg-term-bright"
                      : isToday
                        ? "h-8 border border-term-fg/50 text-sm tabular-nums text-term-bright hover:bg-term-fg/15"
                        : "h-8 text-sm tabular-nums text-term-fg hover:bg-term-fg/15"
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-term-fg/20 pt-2">
            <button type="button" onClick={() => choose(today)} className="label hover:text-term-fg">
              [ Today ]
            </button>
            {!required && value && (
              <button type="button" onClick={() => choose("")} className="label hover:text-term-fg">
                [ Clear ]
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
