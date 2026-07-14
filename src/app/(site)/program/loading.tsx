import { Skeleton } from "@/components/ui/skeleton";

export default function ProgramLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Načítání…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
