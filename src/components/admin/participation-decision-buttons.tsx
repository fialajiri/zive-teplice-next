"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, XIcon } from "lucide-react";
import {
  decideParticipationAction,
  type ParticipationActionResult,
} from "@/server/actions/participation";
import { Button } from "@/components/ui/button";

export function ParticipationDecisionButtons({
  performerId,
  username,
}: {
  performerId: string;
  username: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(decision: "approved" | "rejected") {
    startTransition(async () => {
      const result: ParticipationActionResult = await decideParticipationAction(
        performerId,
        decision,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        decision === "approved"
          ? `Přihláška „${username}" byla schválena.`
          : `Přihláška „${username}" byla zamítnuta.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => decide("approved")}
      >
        <CheckIcon />
        Schválit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => decide("rejected")}
      >
        <XIcon />
        Zamítnout
      </Button>
    </div>
  );
}
