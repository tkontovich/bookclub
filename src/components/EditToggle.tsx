"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { lockSite } from "@/lib/actions";

/**
 * Switches edit mode on (password prompt) and off (clears the cookie).
 * Purely an affordance - the actual enforcement lives in the server
 * actions, which refuse to run while locked.
 */
export function EditToggle({ unlocked }: { unlocked: boolean }) {
  const pathname = usePathname();

  if (!unlocked) {
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(pathname)}`}
        className="label border border-term-fg/35 px-2 py-1 hover:border-term-fg hover:text-term-fg"
      >
        Edit: Off
      </Link>
    );
  }

  return (
    <form action={lockSite}>
      <button
        type="submit"
        className="label border border-term-green/60 px-2 py-1 text-term-green hover:border-term-green hover:text-term-bright"
      >
        Edit: On
      </button>
    </form>
  );
}
