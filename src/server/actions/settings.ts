"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import {
  setRegistrationOpen,
  setSocialLinks,
} from "@/server/application/settings";
import type { FieldErrors } from "@/server/domain/result";

export type SetRegistrationOpenResult =
  { ok: true; registrationOpen: boolean } | { ok: false; error: string };

export async function setRegistrationOpenAction(
  open: boolean,
): Promise<SetRegistrationOpenResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: "Nedostatečná oprávnění." };

  // Never trust a coerced/undefined client value — the flag gates registration.
  if (typeof open !== "boolean") {
    return { ok: false, error: "Neplatný požadavek." };
  }

  const result = await setRegistrationOpen(container.settingsRepository, open);
  if (!result.ok) return { ok: false, error: result.error.message };

  // The public form (shown/hidden by the flag) and the admin dashboard both read it.
  revalidatePath("/registrace");
  revalidatePath("/admin");
  return { ok: true, registrationOpen: result.value.registrationOpen };
}

export type SetSocialLinksResult =
  | { ok: true; facebookUrl: string; instagramUrl: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function setSocialLinksAction(
  input: unknown,
): Promise<SetSocialLinksResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: "Nedostatečná oprávnění." };

  const record = input as { facebookUrl?: unknown; instagramUrl?: unknown };
  const result = await setSocialLinks(container.settingsRepository, {
    facebookUrl: String(record?.facebookUrl ?? ""),
    instagramUrl: String(record?.instagramUrl ?? ""),
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error.message,
      fieldErrors:
        result.error.kind === "validation"
          ? result.error.fieldErrors
          : undefined,
    };
  }

  // The header/footer on every page read the links, and the admin dashboard
  // shows the form that just changed them.
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  return {
    ok: true,
    facebookUrl: result.value.facebookUrl,
    instagramUrl: result.value.instagramUrl,
  };
}
