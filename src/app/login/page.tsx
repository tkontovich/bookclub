import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <form action={login} className="panel w-full max-w-sm space-y-4 p-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl leading-none text-term-bright">
            CLIT Club
            <span className="cursor-block" aria-hidden="true" />
          </h1>
          <p className="label">Authentication required</p>
        </div>

        <p className="rule">{"-".repeat(120)}</p>

        {error && (
          <p className="border border-term-fg/40 bg-term-fg/10 px-3 py-2 text-xs uppercase tracking-widest text-term-bright">
            ! Access denied
          </p>
        )}

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

        <button type="submit" className="btn btn-primary w-full">
          Enter
        </button>
      </form>
    </div>
  );
}
