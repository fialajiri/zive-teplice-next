import { Skeleton } from "@/components/ui/skeleton";

// Shared loading shape for single-item detail routes (news, program, performer).
export function DetailSkeleton({
  layout = "stacked",
}: {
  layout?: "stacked" | "sidebar";
}) {
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Načítání…</span>
      <Skeleton className="h-4 w-32" />
      {layout === "sidebar" ? (
        <div className="grid gap-8 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ) : (
        <>
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </>
      )}
    </div>
  );
}
