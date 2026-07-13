"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV_LINKS = [
  { href: "/", label: "Domů" },
  { href: "/aktuality", label: "Aktuality" },
  { href: "/program", label: "Program" },
  { href: "/galerie", label: "Galerie" },
  { href: "/ucinkujici", label: "Účinkující" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

const linkClass =
  "hover:bg-muted hover:text-foreground rounded-md px-3 py-2 transition-colors";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AuthNav() {
  const { data: session, status } = useSession();

  // Avoid flashing the wrong control before the session resolves client-side.
  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <Link
        href="/prihlaseni"
        className={cn(linkClass, "text-muted-foreground")}
      >
        Přihlásit
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {session.user.role === "admin" ? (
        <Link href="/admin" className={cn(linkClass, "text-muted-foreground")}>
          Admin
        </Link>
      ) : null}
      <Link href="/ucet" className={cn(linkClass, "text-muted-foreground")}>
        Můj účet
      </Link>
      <LogoutButton />
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <nav aria-label="Hlavní navigace">
            <ul className="flex flex-wrap items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        linkClass,
                        active
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-border/60 border-l pl-2">
            <AuthNav />
          </div>
        </div>
      </div>
    </header>
  );
}
