import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { container } from "@/server/container";
import { getPerformerAccount } from "@/server/application/performers";
import { LogoutButton } from "@/components/auth/logout-button";
import { AccountProfileForm } from "@/components/auth/account-profile-form";
import { ParticipationCard } from "@/components/auth/participation-card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountButton } from "@/components/auth/delete-account-button";

export const metadata: Metadata = {
  title: "Můj účet",
};

export default async function AccountPage() {
  const session = await auth();
  // The layout already redirects logged-out visitors; this narrows the type.
  if (!session) return null;

  const account =
    session.user.role === "admin"
      ? null
      : await getPerformerAccount(
          container.performerRepository,
          session.user.id,
        );

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Můj účet</h1>
          <p className="text-muted-foreground text-sm">
            Přihlášen jako <strong>{session.user.name}</strong>.
          </p>
        </div>
        <LogoutButton />
      </header>

      {session.user.role === "admin" ? (
        <section className="border-border/60 flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm">
            Jste přihlášeni jako administrátor. Správa obsahu je v administraci.
          </p>
          <Link
            href="/admin"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            Přejít do administrace →
          </Link>
        </section>
      ) : account && account.ok ? (
        <>
          <ParticipationCard
            performerId={account.value.id}
            status={account.value.request}
          />

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Profil</h2>
            <AccountProfileForm
              performerId={account.value.id}
              initial={{
                username: account.value.username,
                phoneNumber: account.value.phoneNumber,
                description: account.value.description,
                image: account.value.image,
              }}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Změna hesla</h2>
            <ChangePasswordForm />
          </section>

          <section className="border-destructive/30 flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Smazání účtu</h2>
              <p className="text-muted-foreground text-sm">
                Trvale odstraní váš profil. Tuto akci nelze vzít zpět.
              </p>
            </div>
            <DeleteAccountButton performerId={account.value.id} />
          </section>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Váš profil se nepodařilo načíst. Zkuste to prosím později.
        </p>
      )}

      <Link
        href="/"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← Zpět na web
      </Link>
    </main>
  );
}
