import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";

// Authenticated pages are never cached.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Logged out → to login, returning here afterwards.
  if (!session) {
    redirect(`/prihlaseni?callbackUrl=${encodeURIComponent("/admin")}`);
  }

  // Logged in but not an admin → send to their own area (NOT back to login,
  // which would bounce through callbackUrl and loop).
  if (session.user.role !== "admin") {
    redirect("/ucet");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold tracking-tight">
              Administrace
            </Link>
            <nav aria-label="Administrace" className="flex items-center gap-4">
              <Link
                href="/admin/aktuality"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Aktuality
              </Link>
              <Link
                href="/admin/galerie"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Galerie
              </Link>
              <Link
                href="/admin/rocniky"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Ročníky
              </Link>
              <Link
                href="/admin/ucinkujici"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Účinkující
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              ← Web
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
