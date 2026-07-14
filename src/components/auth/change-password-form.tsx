"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  changePasswordAction,
  type PasswordActionResult,
} from "@/server/actions/password";
import type { FieldErrors } from "@/server/domain/result";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result: PasswordActionResult = await changePasswordAction({
        currentPassword: String(form.get("currentPassword") ?? ""),
        password: String(form.get("password") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
      });
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success("Heslo bylo změněno.");
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-5"
      noValidate
    >
      <Field
        id="currentPassword"
        label="Současné heslo"
        autoComplete="current-password"
        error={fieldError("currentPassword")}
      />
      <Field
        id="password"
        label="Nové heslo"
        autoComplete="new-password"
        hint="Alespoň 8 znaků."
        error={fieldError("password")}
      />
      <Field
        id="confirmPassword"
        label="Nové heslo znovu"
        autoComplete="new-password"
        error={fieldError("confirmPassword")}
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Ukládám…" : "Změnit heslo"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  hint,
  error,
}: {
  id: string;
  label: string;
  autoComplete?: string;
  hint?: string;
  error?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        minLength={8}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
