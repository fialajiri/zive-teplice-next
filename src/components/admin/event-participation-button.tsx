"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlusIcon, UserMinusIcon } from "lucide-react";
import {
  decideParticipationAction,
  type ParticipationActionResult,
} from "@/server/actions/participation";
import type { ParticipationStatus } from "@/server/domain/performer";
import { Button } from "@/components/ui/button";

// Quick-toggle for the current ročník, independent of the pending-request
// workflow: "notsend"/"rejected" -> "approved" adds the performer directly,
// "approved" -> "rejected" removes them. "pending" shows nothing here — that
// goes through ParticipationDecisionButtons instead.
export function EventParticipationButton({
  performerId,
  username,
  status,
}: {
  performerId: string;
  username: string;
  status: ParticipationStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status === "pending") return null;

  const isAdd = status !== "approved";

  function handleClick() {
    startTransition(async () => {
      const result: ParticipationActionResult = await decideParticipationAction(
        performerId,
        isAdd ? "approved" : "rejected",
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isAdd
          ? `„${username}" byl zařazen do aktuálního ročníku.`
          : `„${username}" byl odebrán z aktuálního ročníku.`,
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={isAdd ? "outline" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={handleClick}
      aria-label={
        isAdd
          ? `Přidat „${username}“ do aktuálního ročníku`
          : `Odebrat „${username}“ z aktuálního ročníku`
      }
    >
      {isAdd ? <UserPlusIcon /> : <UserMinusIcon />}
      {isAdd ? "Přidat" : "Odebrat"}
    </Button>
  );
}
