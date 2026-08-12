"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="panel w-full max-w-md space-y-4 p-6">
        <h1 className="font-display text-2xl uppercase leading-none text-term-bright">
          ! System fault
        </h1>
        <p className="rule">{"-".repeat(120)}</p>
        <p className="text-sm text-term-fg">{error.message}</p>
        <button onClick={reset} className="btn btn-primary">
          Retry
        </button>
      </div>
    </div>
  );
}
