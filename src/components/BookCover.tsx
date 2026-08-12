export function BookCover({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-md bg-neutral-100 p-2 text-center text-xs text-neutral-400 dark:bg-neutral-800">
        No cover
      </div>
    );
  }
  return (
    // Cover URLs come from Google Books or arbitrary manual entry, so we
    // can't whitelist a fixed set of remote hosts for next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="aspect-[2/3] w-full rounded-md object-cover" />
  );
}
