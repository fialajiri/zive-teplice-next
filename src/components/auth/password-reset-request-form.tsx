"use client";

import { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/server/actions/password";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export function PasswordResetRequestForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    startTransition(async () => {
      const result = await requestPasswordResetAction(email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Generic confirmation — same whether or not the email is registered.
      setDone(true);
    });
  }

  if (done) {
    return (
      <p
        role="status"
        className="border-border/60 bg-muted/40 rounded-lg border px-3 py-3 text-center text-sm"
      >
        Pokud k zadanému e-mailu existuje účet, poslali jsme na něj odkaz pro
        obnovení hesla. Zkontrolujte prosím svou schránku.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={error ? true : undefined}
          className={inputClass}
        />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Odesílám…" : "Odeslat odkaz"}
      </Button>
    </form>
  );
}
