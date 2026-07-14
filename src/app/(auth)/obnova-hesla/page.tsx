import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const metadata: Metadata = {
  title: "Obnovení hesla",
};

export default function PasswordResetRequestPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Zapomenuté heslo
        </h1>
        <p className="text-muted-foreground text-sm">
          Zadejte svůj e-mail a pošleme vám odkaz pro nastavení nového hesla.
        </p>
      </div>

      <PasswordResetRequestForm />

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/prihlaseni" className="text-foreground underline">
          Zpět na přihlášení
        </Link>
      </p>
    </div>
  );
}
