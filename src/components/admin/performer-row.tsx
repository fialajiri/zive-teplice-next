"use client";

import { useState } from "react";
import type { PerformerAccountDto } from "@/server/domain/performer";
import { ParticipationDecisionButtons } from "@/components/admin/participation-decision-buttons";
import { ParticipationStatusBadge } from "@/components/admin/participation-status-badge";
import { EventParticipationButton } from "@/components/admin/event-participation-button";
import { DeletePerformerButton } from "@/components/admin/delete-performer-button";
import { PerformerDetailDialog } from "@/components/admin/performer-detail-dialog";

// The whole row opens the detail dialog (mouse: click anywhere; keyboard: Tab to
// the row, Enter/Space) — except the actions cell, which stops the click/keydown
// from bubbling so Smazat/Schválit/Zamítnout still work as their own controls.
export function PerformerRow({
  performer,
}: {
  performer: PerformerAccountDto;
}) {
  const [open, setOpen] = useState(false);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    // Only react when the row itself (not a nested button) is the focused
    // target — otherwise Enter on Smazat would also open the dialog.
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <tr
        className="border-border/40 hover:bg-muted/40 focus-visible:bg-muted/40 cursor-pointer border-b outline-none last:border-0"
        role="button"
        tabIndex={0}
        aria-label={`Zobrazit detail: ${performer.username}`}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      >
        <td
          className="truncate px-4 py-3 font-medium"
          title={performer.username}
        >
          {performer.username}
        </td>
        <td
          className="text-muted-foreground truncate px-4 py-3"
          title={performer.email}
        >
          {performer.email}
        </td>
        <td className="px-4 py-3">
          <ParticipationStatusBadge status={performer.request} />
        </td>
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <EventParticipationButton
            performerId={performer.id}
            username={performer.username}
            status={performer.request}
          />
        </td>
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {performer.request === "pending" ? (
              <ParticipationDecisionButtons
                performerId={performer.id}
                username={performer.username}
              />
            ) : null}
            <DeletePerformerButton
              id={performer.id}
              username={performer.username}
            />
          </div>
        </td>
      </tr>
      <PerformerDetailDialog
        performer={performer}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
