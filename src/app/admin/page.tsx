import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { container } from "@/server/container";
import { getRegistrationOpen } from "@/server/application/settings";
import { RegistrationToggle } from "@/components/admin/registration-toggle";

export const metadata: Metadata = {
  title: "Administrace",
};

export default async function AdminPage() {
  const session = await auth();
  const registrationOpen = await getRegistrationOpen(
    container.settingsRepository,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Přehled</h1>
        <p className="text-muted-foreground text-sm">
          Přihlášen jako <strong>{session?.user.name}</strong> (administrátor).
        </p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Správa obsahu</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/aktuality"
            className={buttonVariants({ variant: "outline" })}
          >
            Aktuality
          </Link>
          <Link
            href="/admin/ucinkujici"
            className={buttonVariants({ variant: "outline" })}
          >
            Účinkující
          </Link>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Nastavení</h2>
        <RegistrationToggle open={registrationOpen} />
      </section>
    </div>
  );
}
