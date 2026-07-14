"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { deletePerformerAction } from "@/server/actions/performers";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

// Self-service account deletion. On success the account row is gone but the JWT
// session is stateless, so we sign out and hard-navigate home to drop it.
export function DeleteAccountButton({ performerId }: { performerId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deletePerformerAction(performerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await logout();
      window.location.assign("/");
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
        Smazat účet
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-account-title"
        className="bg-popover text-popover-foreground m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border p-6 shadow-lg backdrop:bg-black/50"
      >
        <h2 id="delete-account-title" className="text-lg font-semibold">
          Smazat účet
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Opravdu chcete trvale smazat svůj účet? Tuto akci nelze vzít zpět —
          odstraní se váš profil i profilový obrázek.
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
            {pending ? "Mažu…" : "Smazat účet"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
