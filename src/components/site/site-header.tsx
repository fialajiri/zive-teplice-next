"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { FacebookIcon, InstagramIcon } from "@/components/site/social-icons";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NAV_LINKS = [
  { href: "/", label: "Domů" },
  { href: "/aktuality", label: "Aktuality" },
  { href: "/program", label: "Program" },
  { href: "/galerie", label: "Galerie" },
  { href: "/ucinkujici", label: "Účinkující" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export type SocialLinks = {
  facebookUrl: string;
  instagramUrl: string;
};

function socialItems(links: SocialLinks) {
  return [
    links.facebookUrl
      ? { href: links.facebookUrl, label: "Facebook", Icon: FacebookIcon }
      : null,
    links.instagramUrl
      ? { href: links.instagramUrl, label: "Instagram", Icon: InstagramIcon }
      : null,
  ].filter((item) => item !== null);
}

const linkClass =
  "hover:bg-muted hover:text-foreground rounded-md px-3 py-2 transition-colors";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AuthNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, status } = useSession();

  // Avoid flashing the wrong control before the session resolves client-side.
  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <Link
        href="/prihlaseni"
        onClick={onNavigate}
        className={cn(linkClass, "text-muted-foreground")}
      >
        Přihlásit
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1 max-lg:flex-col max-lg:items-stretch">
      {session.user.role === "admin" ? (
        <Link
          href="/admin"
          onClick={onNavigate}
          className={cn(linkClass, "text-muted-foreground")}
        >
          Admin
        </Link>
      ) : (
        <Link
          href="/ucet"
          onClick={onNavigate}
          className={cn(linkClass, "text-muted-foreground")}
        >
          Můj účet
        </Link>
      )}
      <LogoutButton />
    </div>
  );
}

function SocialNav({
  links,
  compact,
}: {
  links: SocialLinks;
  compact?: boolean;
}) {
  const items = socialItems(links);
  if (items.length === 0) return null;

  return (
    <ul aria-label="Sociální sítě" className="flex items-center gap-0.5">
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center rounded-md transition-colors",
              compact ? "size-8" : "size-9",
            )}
          >
            <Icon className={compact ? "size-4" : "size-[18px]"} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Hlavní navigace" className="hidden lg:block">
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
  );
}

function MobileNav({
  pathname,
  socialLinks,
}: {
  pathname: string;
  socialLinks: SocialLinks;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Otevřít menu"
            className="hover:bg-muted -mr-2 flex size-9 items-center justify-center rounded-md lg:hidden"
          />
        }
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </DialogTrigger>
      <DialogContent className="top-4 max-w-[calc(100%-2rem)] translate-y-0 sm:max-w-sm">
        <DialogTitle className="text-lg">Menu</DialogTitle>
        <nav aria-label="Hlavní navigace">
          <ul className="flex flex-col gap-1 text-base">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block",
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
        <div className="border-border/60 flex items-center justify-between border-t pt-2">
          <AuthNav onNavigate={close} />
          <div className="flex items-center gap-1">
            <SocialNav links={socialLinks} />
            <ThemeToggle />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SiteHeader({ socialLinks }: { socialLinks: SocialLinks }) {
  const pathname = usePathname();

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          aria-label="Živé Teplice — domů"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap"
        >
          <img
            src="/img/logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 sm:h-9 sm:w-9"
          />
          <span
            aria-hidden="true"
            className="font-heading hidden text-lg tracking-tight sm:inline"
          >
            Živé Teplice
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <DesktopNav pathname={pathname} />
          <div className="border-border/60 hidden items-center border-l pl-2 lg:flex">
            <AuthNav />
            <SocialNav links={socialLinks} compact />
            <ThemeToggle />
          </div>
          <MobileNav pathname={pathname} socialLinks={socialLinks} />
        </div>
      </div>
    </header>
  );
}
