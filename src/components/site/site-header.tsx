"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Domů" },
  { href: "/aktuality", label: "Aktuality" },
  { href: "/program", label: "Program" },
  { href: "/galerie", label: "Galerie" },
  { href: "/ucinkujici", label: "Účinkující" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <nav aria-label="Hlavní navigace">
          <ul className="flex flex-wrap items-center gap-1 text-sm">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "hover:bg-muted hover:text-foreground rounded-md px-3 py-2 transition-colors",
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
      </div>
    </header>
  );
}
