import Link from "next/link";
import { cookies } from "next/headers";
import { getActiveMembers } from "@/lib/data";
import { MEMBER_COOKIE_NAME } from "@/lib/session";
import { MemberSwitcher } from "./MemberSwitcher";

const links = [
  { href: "/", label: "Current" },
  { href: "/vote", label: "Vote" },
  { href: "/past", label: "Past Books" },
  { href: "/settings", label: "Settings" },
];

export async function NavBar() {
  const [members, cookieStore] = await Promise.all([getActiveMembers(), cookies()]);
  const currentMemberId = cookieStore.get(MEMBER_COOKIE_NAME)?.value ?? null;

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 p-4">
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <span className="font-semibold">📚 Book Club</span>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <MemberSwitcher members={members} currentMemberId={currentMemberId} />
      </div>
    </header>
  );
}
