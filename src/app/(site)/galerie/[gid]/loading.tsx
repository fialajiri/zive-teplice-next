import { Skeleton } from "@/components/ui/skeleton";

export default function GalleryDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Načítání…</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-1/3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
