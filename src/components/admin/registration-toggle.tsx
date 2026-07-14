"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setRegistrationOpenAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";

// `open` is the authoritative server state (read in the RSC). We don't mirror it
// into local state — after a successful toggle we refresh the route so the RSC
// re-reads and re-renders with the new value.
export function RegistrationToggle({ open }: { open: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await setRegistrationOpenAction(!open);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.registrationOpen
          ? "Registrace účinkujících je otevřená."
          : "Registrace účinkujících je uzavřená.",
      );
      router.refresh();
    });
  }

  return (
    <div className="border-border/60 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Registrace účinkujících</span>
        <span className="text-muted-foreground text-sm">
          {open
            ? "Otevřená — veřejný formulář přijímá nové registrace."
            : "Uzavřená — veřejný formulář je skrytý a registrace se odmítají."}
        </span>
      </div>
      <Button
        type="button"
        variant={open ? "outline" : "default"}
        disabled={pending}
        onClick={handleToggle}
      >
        {pending
          ? "Ukládám…"
          : open
            ? "Uzavřít registraci"
            : "Otevřít registraci"}
      </Button>
    </div>
  );
}
