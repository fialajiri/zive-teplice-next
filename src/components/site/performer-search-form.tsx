"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEBOUNCE_MS = 400;

export function PerformerSearchForm({
  basePath,
  initialQuery,
}: {
  basePath: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending debounce on unmount so it can't navigate after the page is gone.
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function navigate(next: string) {
    const params = new URLSearchParams();
    if (next.trim()) params.set("q", next.trim());
    const qs = params.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    navigate(value);
  }

  return (
    <form
      action={basePath}
      method="get"
      role="search"
      onSubmit={handleSubmit}
      className="mb-8 flex max-w-sm gap-2"
    >
      <label htmlFor="performer-search" className="sr-only">
        Hledat účinkujícího podle jména
      </label>
      <Input
        id="performer-search"
        name="q"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Hledat podle jména…"
      />
      <Button type="submit">Hledat</Button>
    </form>
  );
}
