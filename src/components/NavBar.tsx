import Link from "next/link";

const links = [
  { href: "/settings", label: "Settings" },
  { href: "/", label: "Home" },
];

export function NavBar() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 p-4 text-sm font-medium">
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
      </div>
    </header>
  );
}
