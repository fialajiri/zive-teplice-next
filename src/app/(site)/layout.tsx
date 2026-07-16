import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { container } from "@/server/container";
import { getSocialLinks } from "@/server/application/settings";

// Shared marketing layout for all public pages. Provides the single <main>
// landmark; the root layout owns <body>, providers, and the toaster.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const socialLinks = await getSocialLinks(container.settingsRepository);

  return (
    <>
      <SiteHeader socialLinks={socialLinks} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
      <SiteFooter socialLinks={socialLinks} />
    </>
  );
}
