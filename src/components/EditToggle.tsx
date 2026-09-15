"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lockSite } from "@/lib/actions";

export const NAV_REVEAL_KEY = "nav-settings-revealed";

/**
 * Padlock that switches edit mode on (password prompt) and off (clears the
 * cookie). Purely an affordance - the actual enforcement lives in the
 * server actions, which refuse to run while locked.
 */
export function EditToggle({ unlocked }: { unlocked: boolean }) {
  const pathname = usePathname();

  if (!unlocked) {
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(pathname)}`}
        aria-label="Unlock edit mode"
        title="Unlock edit mode"
        className="text-term-dim hover:text-term-bright"
      >
        <PadlockIcon open={false} />
      </Link>
    );
  }

  return (
    <form
      action={lockSite}
      onSubmit={() => {
        // Let the settings gear slide in again next time edit mode is unlocked.
        try {
          sessionStorage.removeItem(NAV_REVEAL_KEY);
        } catch {}
      }}
      className="flex"
    >
      <input type="hidden" name="from" value={pathname} />
      <button
        type="submit"
        aria-label="Lock edit mode"
        title="Edit mode on · click to lock"
        className="text-term-green hover:text-term-bright"
      >
        <PadlockIcon open />
      </button>
    </form>
  );
}

function PadlockIcon({ open }: { open: boolean }) {
  return (
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
    >
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="1.5" />
      <path d={open ? "M8 10.5V7a4 4 0 0 1 7.8-1.25" : "M8 10.5V7a4 4 0 0 1 8 0v3.5"} />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}
