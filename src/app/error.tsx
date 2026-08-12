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
      <div className="w-full max-w-sm space-y-3 rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-800">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
