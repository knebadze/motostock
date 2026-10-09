// Suspense fallback for HomepageSectionContent — approximates that
// component's real shape (a heading + a row of cards per section) closely
// enough to keep layout shift small once the real content streams in.
export function HomeSectionsSkeleton({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <section key={index} className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8" aria-hidden>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-6 flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }, (_, cardIndex) => (
              <div
                key={cardIndex}
                className="aspect-[3/4] w-full max-w-56 shrink-0 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
