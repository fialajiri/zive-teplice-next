"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";

// Client providers mounted once in the root layout. SessionProvider fetches the
// session client-side (via /api/auth/session) so the header can reflect auth
// state without opting public pages out of static rendering / ISR.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
