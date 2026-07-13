"use client";

import { useTransition } from "react";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await logout();
      // Full-page load so SessionProvider drops the stale authenticated state.
      window.location.assign("/");
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Odhlašuji…" : "Odhlásit"}
    </Button>
  );
}
