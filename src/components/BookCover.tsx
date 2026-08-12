export function BookCover({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center border border-dashed border-term-fg/30 bg-term-fg/[0.03] p-2 text-center text-[0.625rem] uppercase tracking-widest text-term-dim">
        No cover
      </div>
    );
  }
  return (
    // Cover URLs come from Google Books or arbitrary manual entry, so we
    // can't whitelist a fixed set of remote hosts for next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="cover aspect-[2/3] w-full border border-term-fg/30 object-cover"
    />
  );
}
