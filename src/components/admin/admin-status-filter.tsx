"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FunnelIcon } from "lucide-react";
import type { ParticipationStatus } from "@/server/domain/performer";
import {
  PARTICIPATION_STATUSES,
  PARTICIPATION_STATUS_LABEL,
} from "@/lib/participation-status";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Column-header enum filter for "Účast" (URL-driven, `?status=`). Collapsed to
// just the column label + a funnel icon (highlighted when a filter is active)
// so the header doesn't reflow — clicking opens a popover to pick one status;
// picking a value navigates immediately and closes the popover.
export function AdminStatusFilter({
  basePath,
  initialStatus,
  initialQuery,
}: {
  basePath: string;
  initialStatus: ParticipationStatus | "";
  initialQuery: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = initialStatus !== "";

  function select(status: ParticipationStatus | "") {
    const params = new URLSearchParams();
    if (initialQuery) params.set("q", initialQuery);
    if (status) params.set("status", status);
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-1.5 font-medium">
      Účast
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant={isActive ? "default" : "ghost"}
              size="icon-xs"
            />
          }
        >
          <FunnelIcon />
          <span className="sr-only">
            {isActive
              ? `Filtrovat podle účasti (aktivní filtr: ${PARTICIPATION_STATUS_LABEL[initialStatus as ParticipationStatus]})`
              : "Filtrovat podle účasti"}
          </span>
        </PopoverTrigger>
        <PopoverContent>
          <fieldset className="flex flex-col gap-0.5">
            <legend className="text-muted-foreground px-2 pb-1.5 text-xs font-normal">
              Filtrovat podle účasti
            </legend>
            <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal">
              <input
                type="radio"
                name="status-filter"
                checked={initialStatus === ""}
                onChange={() => select("")}
              />
              Vše
            </label>
            {PARTICIPATION_STATUSES.map((status) => (
              <label
                key={status}
                className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-normal"
              >
                <input
                  type="radio"
                  name="status-filter"
                  checked={initialStatus === status}
                  onChange={() => select(status)}
                />
                {PARTICIPATION_STATUS_LABEL[status]}
              </label>
            ))}
          </fieldset>
        </PopoverContent>
      </Popover>
    </div>
  );
}
