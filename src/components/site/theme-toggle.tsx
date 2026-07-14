"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

const noopSubscribe = () => () => {};

// Avoid a hydration mismatch: the server can't know the client's preferred
// theme, so render a neutral placeholder until mounted client-side.
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="size-9" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"
      }
      className="hover:bg-muted flex size-9 items-center justify-center rounded-md transition-colors"
    >
      {isDark ? (
        <SunIcon aria-hidden="true" className="size-5" />
      ) : (
        <MoonIcon aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}
