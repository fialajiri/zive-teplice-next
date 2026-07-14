"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestParticipationAction } from "@/server/actions/participation";
import type { ParticipationStatus } from "@/server/domain/performer";
import { Button } from "@/components/ui/button";

const STATUS_COPY: Record<
  ParticipationStatus,
  { label: string; description: string; canRequest: boolean; cta: string }
> = {
  notsend: {
    label: "Nepodáno",
    description: "Zatím jste nepožádali o účast v aktuálním ročníku.",
    canRequest: true,
    cta: "Požádat o účast",
  },
  pending: {
    label: "Čeká na schválení",
    description: "Vaše žádost o účast byla odeslána a čeká na rozhodnutí.",
    canRequest: false,
    cta: "Požádat o účast",
  },
  approved: {
    label: "Schváleno",
    description: "Vaše účast v aktuálním ročníku byla schválena.",
    canRequest: false,
    cta: "Požádat o účast",
  },
  rejected: {
    label: "Zamítnuto",
    description: "Vaše předchozí žádost byla zamítnuta. Můžete požádat znovu.",
    canRequest: true,
    cta: "Požádat znovu",
  },
};

export function ParticipationCard({
  performerId,
  status,
}: {
  performerId: string;
  status: ParticipationStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const copy = STATUS_COPY[status];

  function handleRequest() {
    startTransition(async () => {
      const result = await requestParticipationAction(performerId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Žádost o účast byla odeslána.");
      router.refresh();
    });
  }

  return (
    <div className="border-border/60 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Účast v aktuálním ročníku</h2>
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
          {copy.label}
        </span>
      </div>
      <p className="text-muted-foreground text-sm">{copy.description}</p>
      {copy.canRequest ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleRequest}
          className="self-start"
        >
          {pending ? "Odesílám…" : copy.cta}
        </Button>
      ) : null}
    </div>
  );
}
