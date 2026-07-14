"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createEventAction,
  updateEventAction,
  type EventActionResult,
} from "@/server/actions/events";
import type { FieldErrors } from "@/server/domain/result";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export type EventFormInitial = { title: string; year: number };

type EventFormProps =
  | { mode: "create"; eventId?: undefined; initial?: undefined }
  | { mode: "edit"; eventId: string; initial: EventFormInitial };

export function EventForm({ mode, eventId, initial }: EventFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [year, setYear] = useState(
    initial?.year ? String(initial.year) : String(new Date().getFullYear()),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    startTransition(async () => {
      const payload = { title, year: Number(year) };
      const result: EventActionResult =
        mode === "create"
          ? await createEventAction(payload)
          : await updateEventAction(eventId, payload);

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Ročník byl vytvořen." : "Změny byly uloženy.",
      );
      router.push(
        mode === "create" ? `/admin/rocniky/${result.id}` : "/admin/rocniky",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      {mode === "create" ? (
        <p className="border-border bg-muted/50 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
          Vytvořením se tento ročník stane <strong>aktuálním</strong>. Předchozí
          aktuální ročník se deaktivuje a všem uživatelům se resetuje žádost o
          účast.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Název ročníku
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={10}
          maxLength={100}
          aria-invalid={fieldError("title") ? true : undefined}
          aria-describedby={fieldError("title") ? "title-error" : undefined}
          className={inputClass}
        />
        {fieldError("title") ? (
          <p id="title-error" role="alert" className="text-destructive text-sm">
            {fieldError("title")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">10–100 znaků.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="year" className="text-sm font-medium">
          Rok
        </label>
        <input
          id="year"
          name="year"
          type="number"
          inputMode="numeric"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          required
          min={1000}
          max={9999}
          aria-invalid={fieldError("year") ? true : undefined}
          aria-describedby={fieldError("year") ? "year-error" : undefined}
          className={`${inputClass} max-w-40`}
        />
        {fieldError("year") ? (
          <p id="year-error" role="alert" className="text-destructive text-sm">
            {fieldError("year")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Čtyřmístné číslo.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Ukládám…"
            : mode === "create"
              ? "Vytvořit ročník"
              : "Uložit změny"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={pending}
          onClick={() => router.push("/admin/rocniky")}
        >
          Zrušit
        </Button>
      </div>
    </form>
  );
}
