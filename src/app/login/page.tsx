import Link from "next/link";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo } = await searchParams;
  const destination = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <form action={login} className="panel w-full max-w-sm space-y-4 p-6">
        <input type="hidden" name="returnTo" value={destination} />

        <div className="space-y-1">
          <h1 className="font-display text-3xl leading-none text-term-bright">
            CLIT Club
            <span className="cursor-block" aria-hidden="true" />
          </h1>
          <p className="label">Turn on edit mode</p>
        </div>

        <p className="rule">{"-".repeat(120)}</p>

        {error && (
          <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
            ! Wrong password
          </p>
        )}

        <p className="text-xs text-term-dim">
          Anyone can read the site. The password is only needed to change things.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoFocus
            required
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary">
            Unlock
          </button>
          <Link href={destination} className="label hover:text-term-fg">
            [ Cancel ]
          </Link>
        </div>
      </form>
    </div>
  );
}
