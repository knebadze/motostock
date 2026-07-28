// logo.svg is the wordmark only (transparent background, white "Motostock" +
// yellow "22" + underline) — the oval background is drawn here instead of
// baked into the SVG, so its size relative to the mark can be tuned per spot
// without needing a second logo asset.
export function Logo({
  className = "h-9",
  padding = "px-4 py-1",
}: {
  className?: string;
  padding?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-black ring-1 ring-white/15 ${padding} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="Motostock" className="h-full w-auto" />
    </span>
  );
}
