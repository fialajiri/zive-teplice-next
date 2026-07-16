import Link from "next/link";

const FOOTER_NAV = [
  { href: "/aktuality", label: "Aktuality" },
  { href: "/program", label: "Program" },
  { href: "/galerie", label: "Galerie" },
  { href: "/ucinkujici", label: "Účinkující" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

const linkClass = "hover:text-foreground transition-colors";

export function SiteFooter({
  socialLinks,
}: {
  socialLinks: { facebookUrl: string; instagramUrl: string };
}) {
  const year = new Date().getFullYear();
  const social = [
    socialLinks.facebookUrl
      ? { href: socialLinks.facebookUrl, label: "Facebook" }
      : null,
    socialLinks.instagramUrl
      ? { href: socialLinks.instagramUrl, label: "Instagram" }
      : null,
  ].filter((item) => item !== null);

  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto grid max-w-5xl gap-8 px-6 py-10 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <p className="text-foreground font-heading text-base">Živé Teplice</p>
          <p>Sousedská slavnost v Šanovském parku u Mušle, Teplice.</p>
        </div>

        <nav aria-label="Odkazy v patičce">
          <p className="text-foreground mb-2 font-medium">Odkazy</p>
          <ul className="flex flex-col gap-1">
            {FOOTER_NAV.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <address className="not-italic">
          <p className="text-foreground mb-2 font-medium">Kontakt</p>
          <ul className="flex flex-col gap-1">
            <li>
              <a href="mailto:seifrtovanikola@gmail.com" className={linkClass}>
                seifrtovanikola@gmail.com
              </a>
            </li>
            <li>
              <a href="tel:+420607720869" className={linkClass}>
                +420 607 720 869
              </a>
            </li>
            {social.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={linkClass}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </address>
      </div>
      <div className="border-border/60 border-t">
        <p className="text-muted-foreground mx-auto max-w-5xl px-6 py-4 text-xs">
          © {year} Živé Teplice
        </p>
      </div>
    </footer>
  );
}
