import Link from "next/link";
import { isUnlocked } from "@/lib/session";
import { EditToggle } from "./EditToggle";
import { SettingsLink } from "./SettingsLink";

export async function NavBar() {
  const unlocked = await isUnlocked();

  return (
    <header className="relative overflow-hidden border-b border-term-fg/25">
      <span className="beagle-run" aria-hidden="true" />
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 p-4">
        <Link
          href="/"
          className="font-display text-2xl leading-none text-term-bright hover:text-term-fg"
        >
          CLIT Club
          <span className="cursor-block" aria-hidden="true" />
        </Link>
        <div className="flex items-center gap-3">
          <EditToggle unlocked={unlocked} />
          <Link
            href="/analytics"
            aria-label="Analytics"
            title="Analytics"
            className="text-term-dim hover:text-term-bright"
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
            >
              <path d="M3.5 20.5h17" />
              <path d="M7 20.5v-6" />
              <path d="M12 20.5V5.5" />
              <path d="M17 20.5v-9.5" />
            </svg>
          </Link>
          {/* Settings is edit-only, so the gear only exists while unlocked. */}
          {unlocked && <SettingsLink />}
        </div>
      </div>
    </header>
  );
}
