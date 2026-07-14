import type { Metadata } from "next";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktní informace festivalu Živé Teplice.",
};

const CONTACT_ITEMS = [
  {
    icon: User,
    label: "Organizátorka",
    value: "Nikola Fialová Seifrtová",
    href: undefined,
  },
  {
    icon: MapPin,
    label: "Místo konání",
    value: "U Mušle v Šanovském parku, Teplice",
    href: undefined,
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "seifrtovanikola@gmail.com",
    href: "mailto:seifrtovanikola@gmail.com",
  },
  {
    icon: Phone,
    label: "Telefon",
    value: "+420 607 720 869",
    href: "tel:+420607720869",
  },
] as const;

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/ZiveTeplice2023", label: "Facebook" },
  { href: "https://www.instagram.com/zive_teplice/", label: "Instagram" },
] as const;

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Kontakt"
        description="Máte dotaz k festivalu, chcete se zapojit nebo nás jen pozdravit? Ozvěte se."
      />
      <address className="not-italic">
        <ul className="grid max-w-2xl gap-6 sm:grid-cols-2">
          {CONTACT_ITEMS.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <item.icon
                aria-hidden="true"
                className="text-primary mt-1 size-5 shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-muted-foreground text-sm">
                  {item.label}
                </span>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-foreground font-medium hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">
                    {item.value}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">Sociální sítě</span>
          <ul className="flex flex-wrap gap-4">
            {SOCIAL_LINKS.map((social) => (
              <li key={social.href}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary font-medium hover:underline"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </address>
    </>
  );
}
