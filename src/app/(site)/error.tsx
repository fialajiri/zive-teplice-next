"use client";

import { Button } from "@/components/ui/button";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold">Něco se pokazilo</h1>
      <p className="text-muted-foreground">
        Obsah se nepodařilo načíst. Zkuste to prosím znovu.
      </p>
      <Button onClick={reset}>Zkusit znovu</Button>
    </div>
  );
}
