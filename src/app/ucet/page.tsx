import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Můj účet",
};

// Placeholder — proves the session guard + redirect. The real account area is Phase 5.
export default async function AccountPage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Můj účet</h1>
        <LogoutButton />
      </header>
      <p className="text-muted-foreground text-sm">
        Přihlášen jako <strong>{session?.user.name}</strong>. Správa profilu
        přijde v další fázi.
      </p>
      {session?.user.role === "admin" ? (
        <Link
          href="/admin"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          Přejít do administrace →
        </Link>
      ) : null}
      <Link
        href="/"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← Zpět na web
      </Link>
    </main>
  );
}
