import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktní informace akce Živé Teplice.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader title="Kontakt" description="Máte dotaz? Ozvěte se nám." />
      <address className="text-foreground space-y-2 not-italic">
        <p className="font-medium">Živé Teplice</p>
        <p>
          E-mail:{" "}
          <a
            href="mailto:info@zive-teplice.cz"
            className="text-primary hover:underline"
          >
            info@zive-teplice.cz
          </a>
        </p>
      </address>
    </>
  );
}
