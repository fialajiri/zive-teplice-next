import type { Metadata } from "next";
import { Archivo_Black, Geist_Mono, Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_DESCRIPTION =
  "Kulturní akce Živé Teplice — aktuality, program, galerie a účinkující.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Živé Teplice",
    template: "%s | Živé Teplice",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: "Živé Teplice",
    description: DEFAULT_DESCRIPTION,
    siteName: "Živé Teplice",
    locale: "cs_CZ",
    type: "website",
    images: [{ url: "/hero/festival-2024.jpg", width: 1600, height: 1067 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Živé Teplice",
    description: DEFAULT_DESCRIPTION,
    images: ["/hero/festival-2024.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${roboto.variable} ${archivoBlack.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          {children}
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
