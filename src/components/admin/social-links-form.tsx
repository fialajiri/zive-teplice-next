"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setSocialLinksAction } from "@/server/actions/settings";
import type { FieldErrors } from "@/server/domain/result";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

// `open` is the authoritative server state (read in the RSC). After a
// successful save we refresh the route so the RSC re-reads and re-renders —
// same pattern as RegistrationToggle.
export function SocialLinksForm({
  facebookUrl,
  instagramUrl,
}: {
  facebookUrl: string;
  instagramUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await setSocialLinksAction({
        facebookUrl: String(form.get("facebookUrl") ?? ""),
        instagramUrl: String(form.get("instagramUrl") ?? ""),
      });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Odkazy na sociální sítě byly uloženy.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border/60 flex flex-col gap-4 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Sociální sítě</span>
        <span className="text-muted-foreground text-sm">
          Odkazy zobrazené v hlavičce a patičce webu. Prázdné pole odkaz skryje.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="facebookUrl" className="text-sm font-medium">
          Facebook
        </label>
        <input
          id="facebookUrl"
          name="facebookUrl"
          type="url"
          defaultValue={facebookUrl}
          placeholder="https://www.facebook.com/…"
          aria-invalid={fieldErrors.facebookUrl ? true : undefined}
          aria-describedby={
            fieldErrors.facebookUrl ? "facebookUrl-error" : undefined
          }
          className={inputClass}
        />
        {fieldErrors.facebookUrl ? (
          <p
            id="facebookUrl-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldErrors.facebookUrl[0]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="instagramUrl" className="text-sm font-medium">
          Instagram
        </label>
        <input
          id="instagramUrl"
          name="instagramUrl"
          type="url"
          defaultValue={instagramUrl}
          placeholder="https://www.instagram.com/…"
          aria-invalid={fieldErrors.instagramUrl ? true : undefined}
          aria-describedby={
            fieldErrors.instagramUrl ? "instagramUrl-error" : undefined
          }
          className={inputClass}
        />
        {fieldErrors.instagramUrl ? (
          <p
            id="instagramUrl-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldErrors.instagramUrl[0]}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Uložit odkazy"}
        </Button>
      </div>
    </form>
  );
}
