import type { Metadata } from "next";
import { auth } from "@/auth";
import { container } from "@/server/container";
import {
  getRegistrationOpen,
  getSocialLinks,
} from "@/server/application/settings";
import { RegistrationToggle } from "@/components/admin/registration-toggle";
import { SocialLinksForm } from "@/components/admin/social-links-form";

export const metadata: Metadata = {
  title: "Administrace",
};

export default async function AdminPage() {
  const session = await auth();
  const [registrationOpen, socialLinks] = await Promise.all([
    getRegistrationOpen(container.settingsRepository),
    getSocialLinks(container.settingsRepository),
  ]);

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
        <SocialLinksForm
          facebookUrl={socialLinks.facebookUrl}
          instagramUrl={socialLinks.instagramUrl}
        />
      </section>
    </div>
  );
}
