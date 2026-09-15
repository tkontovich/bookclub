"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NAV_REVEAL_KEY } from "./EditToggle";

/**
 * Settings gear, only rendered while edit mode is on. It slides in the
 * first time it appears after unlocking; later page loads in the same
 * session show it in place. The class is stripped from the DOM directly
 * rather than through state, which would re-render the whole nav.
 */
export function SettingsLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  // React runs effects twice in development. Without this guard the second
  // pass reads the flag the first pass just wrote and cancels the animation.
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    try {
      if (sessionStorage.getItem(NAV_REVEAL_KEY)) ref.current?.classList.remove("nav-reveal");
      else sessionStorage.setItem(NAV_REVEAL_KEY, "1");
    } catch {
      ref.current?.classList.remove("nav-reveal");
    }
  }, []);

  return (
    <Link
      ref={ref}
      href="/settings"
      aria-label="Settings"
      title="Settings"
      className="nav-reveal inline-flex text-term-dim hover:text-term-bright"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  );
}
