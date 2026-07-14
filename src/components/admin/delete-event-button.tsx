"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { deleteEventAction } from "@/server/actions/events";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({
  id,
  title,
  redirectTo,
}: {
  id: string;
  title: string;
  redirectTo?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteEventAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      dialogRef.current?.close();
      toast.success("Ročník byl smazán.");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Trash2Icon />
        Smazat
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-event-title"
        className="bg-popover text-popover-foreground m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border p-6 shadow-lg backdrop:bg-black/50"
      >
        <h2 id="delete-event-title" className="text-lg font-semibold">
          Smazat ročník
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Opravdu chcete smazat „{title}“? Tuto akci nelze vzít zpět — smaže se
          i jeho program.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
          >
            Zrušit
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Mažu…" : "Smazat"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
