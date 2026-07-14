"use client";

import { useState, useTransition } from "react";
import {
  resetPasswordAction,
  type PasswordActionResult,
} from "@/server/actions/password";
import type { FieldErrors } from "@/server/domain/result";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function PasswordResetForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result: PasswordActionResult = await resetPasswordAction(
        token,
        String(form.get("password") ?? ""),
        String(form.get("confirmPassword") ?? ""),
      );
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      // New password set — go log in with it. Full load so no stale state.
      window.location.assign("/prihlaseni?obnova=ok");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {formError ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Nové heslo
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={fieldError("password") ? true : undefined}
          aria-describedby={
            fieldError("password") ? "password-error" : "password-hint"
          }
          className={inputClass}
        />
        {fieldError("password") ? (
          <p
            id="password-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("password")}
          </p>
        ) : (
          <p id="password-hint" className="text-muted-foreground text-xs">
            Alespoň 8 znaků.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Heslo znovu
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={fieldError("confirmPassword") ? true : undefined}
          aria-describedby={
            fieldError("confirmPassword") ? "confirmPassword-error" : undefined
          }
          className={inputClass}
        />
        {fieldError("confirmPassword") ? (
          <p
            id="confirmPassword-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("confirmPassword")}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Ukládám…" : "Nastavit nové heslo"}
      </Button>
    </form>
  );
}
