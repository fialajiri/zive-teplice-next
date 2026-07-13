import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Administrace",
};

// Placeholder — proves the admin guard + redirect. The real dashboard is Phase 3+.
export default async function AdminPage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Administrace</h1>
        <LogoutButton />
      </header>
      <p className="text-muted-foreground text-sm">
        Přihlášen jako <strong>{session?.user.name}</strong> (administrátor).
        Skutečný přehled přijde v další fázi.
      </p>
      <Link
        href="/"
        className="text-primary text-sm underline-offset-4 hover:underline"
      >
        ← Zpět na web
      </Link>
    </main>
  );
}
