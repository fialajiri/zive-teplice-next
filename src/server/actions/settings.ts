"use server";

import { revalidatePath } from "next/cache";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { setRegistrationOpen } from "@/server/application/settings";

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
