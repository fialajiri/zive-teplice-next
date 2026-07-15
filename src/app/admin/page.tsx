import type { Metadata } from "next";
import { auth } from "@/auth";
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
        <h2 className="text-sm font-medium">Nastavení</h2>
        <RegistrationToggle open={registrationOpen} />
      </section>
    </div>
  );
}
