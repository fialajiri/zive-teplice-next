"use client";

import { ThemeProvider } from "next-themes";

// Client providers mounted once in the root layout.
// Phase 2 adds Auth.js <SessionProvider> here alongside the theme provider.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
