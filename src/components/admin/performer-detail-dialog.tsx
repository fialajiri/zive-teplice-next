"use client";

import Image from "next/image";
import type { PerformerAccountDto } from "@/server/domain/performer";
import { ParticipationStatusBadge } from "@/components/admin/participation-status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Read-only profile summary — image, contact info, participation status,
// description. Fed entirely from the already-fetched row data (no extra
// request). Controlled: opened via PerformerRow's click handler on the row.
export function PerformerDetailDialog({
  performer,
  open,
  onOpenChange,
}: {
  performer: PerformerAccountDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex flex-col gap-3 pt-2">
          <div className="bg-muted relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg">
            {performer.image ? (
              <Image
                src={performer.image.imageUrl}
                alt=""
                fill
                sizes="(min-width: 640px) 32rem, 100vw"
                className="object-cover"
              />
            ) : null}
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg">{performer.username}</DialogTitle>
          </DialogHeader>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{performer.email}</dd>
          <dt className="text-muted-foreground">Telefon</dt>
          <dd>{performer.phoneNumber}</dd>
          <dt className="text-muted-foreground">Účast</dt>
          <dd>
            <ParticipationStatusBadge status={performer.request} />
          </dd>
          {performer.description ? (
            <>
              <dt className="text-muted-foreground">Popis</dt>
              <dd className="whitespace-pre-wrap">{performer.description}</dd>
            </>
          ) : null}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
