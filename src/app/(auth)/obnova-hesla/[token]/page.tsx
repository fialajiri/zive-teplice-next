import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const metadata: Metadata = {
  title: "Nastavení nového hesla",
};

export default async function PasswordResetTokenPage({
  params,
}: PageProps<"/obnova-hesla/[token]">) {
  const { token } = await params;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nové heslo</h1>
        <p className="text-muted-foreground text-sm">
          Zvolte si nové heslo ke svému účtu.
        </p>
      </div>

      <PasswordResetForm token={token} />

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/prihlaseni" className="text-foreground underline">
          Zpět na přihlášení
        </Link>
      </p>
    </div>
  );
}
