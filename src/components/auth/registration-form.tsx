"use client";

import { useState, useTransition } from "react";
import {
  registerUserAction,
  type RegisterActionResult,
} from "@/server/actions/registration";
import type { FieldErrors } from "@/server/domain/result";
import {
  ImageUpload,
  type UploadedImage,
} from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function RegistrationForm() {
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (!image) {
      setFieldErrors({ image: ["Nahrajte prosím profilový obrázek."] });
      return;
    }

    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result: RegisterActionResult = await registerUserAction({
        email: String(form.get("email") ?? ""),
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        confirmPassword: String(form.get("confirmPassword") ?? ""),
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        description: String(form.get("description") ?? ""),
        imageUrl: image.imageUrl,
        imageKey: image.imageKey,
      });

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      // Full-page load so the SessionProvider picks up the new (auto sign-in)
      // session and the header reflects the logged-in state.
      window.location.assign(result.redirectTo);
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

      <Field
        id="email"
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        error={fieldError("email")}
      />
      <Field
        id="username"
        name="username"
        label="Jméno / název"
        autoComplete="nickname"
        hint="3–50 znaků. Zobrazuje se veřejně."
        error={fieldError("username")}
      />
      <Field
        id="password"
        name="password"
        label="Heslo"
        type="password"
        autoComplete="new-password"
        hint="Alespoň 8 znaků."
        error={fieldError("password")}
      />
      <Field
        id="confirmPassword"
        name="confirmPassword"
        label="Heslo znovu"
        type="password"
        autoComplete="new-password"
        error={fieldError("confirmPassword")}
      />
      <Field
        id="phoneNumber"
        name="phoneNumber"
        label="Telefon"
        type="tel"
        autoComplete="tel"
        error={fieldError("phoneNumber")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Popis <span className="text-muted-foreground">(nepovinné)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={1000}
          aria-invalid={fieldError("description") ? true : undefined}
          aria-describedby={
            fieldError("description") ? "description-error" : undefined
          }
          className={`${inputClass} h-auto py-2`}
        />
        {fieldError("description") ? (
          <p
            id="description-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("description")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Krátké představení. Můžete doplnit i později.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="image" className="text-sm font-medium">
          Profilový obrázek
        </label>
        <ImageUpload
          id="image"
          prefix="performer"
          aspectRatio={4 / 3}
          alt="Náhled profilového obrázku"
          value={image}
          onChange={setImage}
          ariaInvalid={fieldError("image") ? true : undefined}
          ariaDescribedby={
            fieldError("image") ? "image-field-error" : undefined
          }
        />
        {fieldError("image") ? (
          <p
            id="image-field-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {fieldError("image")}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Registruji…" : "Zaregistrovat se"}
      </Button>
    </form>
  );
}

// A labelled text input with inline hint/error — the registration form has many
// near-identical fields, so this keeps the markup flat and consistent.
function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  hint,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
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
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
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
