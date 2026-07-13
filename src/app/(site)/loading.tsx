export default function SiteLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Načítání…</span>
      <div className="bg-muted h-9 w-1/3 animate-pulse rounded-md" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted aspect-[4/3] animate-pulse rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
