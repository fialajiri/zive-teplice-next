"use server";

import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { container } from "@/server/container";
import {
  registerUser,
  type RegistrationDeps,
} from "@/server/application/registration";
import { hashPassword } from "@/server/infrastructure/auth/password";
import type { DomainError, FieldErrors } from "@/server/domain/result";
import { isValidUploadedImage } from "@/server/actions/image-ref";

export type RegisterActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export type RegisterFormInput = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  description: string;
  imageUrl: string;
  imageKey: string;
};

const INVALID_IMAGE: RegisterActionResult = {
  ok: false,
  error: "Neplatný obrázek.",
  fieldErrors: { image: ["Nahrajte prosím platný obrázek (PNG nebo JPG)."] },
};

function deps(): RegistrationDeps {
  return {
    performers: container.performerRepository,
    settings: container.settingsRepository,
    hashPassword,
  };
}

function mapError(error: DomainError): RegisterActionResult {
  if (error.kind === "validation") {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  return { ok: false, error: error.message };
}

export async function registerUserAction(
  input: RegisterFormInput,
): Promise<RegisterActionResult> {
  // Public action (no admin guard). The registration gate is enforced inside the
  // use case (server-side), so a direct call with the form closed is rejected.
  const email = String(input?.email ?? "").trim();
  const password = String(input?.password ?? "");
  const imageUrl = String(input?.imageUrl ?? "");
  const imageKey = String(input?.imageKey ?? "");

  if (!isValidUploadedImage(imageUrl, imageKey, "performer")) {
    return INVALID_IMAGE;
  }

  const result = await registerUser(deps(), {
    email,
    username: String(input?.username ?? ""),
    password,
    confirmPassword: String(input?.confirmPassword ?? ""),
    phoneNumber: String(input?.phoneNumber ?? ""),
    description: String(input?.description ?? ""),
    image: { imageUrl, imageKey },
  });
  if (!result.ok) return mapError(result.error);

  // The new performer now appears on the public list; the form's closed/open
  // notice is unchanged but revalidate for good measure.
  revalidatePath("/ucinkujici");

  // Auto sign-in with the just-submitted credentials (decided §0). On ANY
  // sign-in failure the account still exists — fall back to the login page with
  // a success flash rather than stranding the user.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: true, redirectTo: "/prihlaseni?registrace=ok" };
    }
    throw error;
  }
  return { ok: true, redirectTo: "/ucet" };
}
