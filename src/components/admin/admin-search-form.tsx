"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEBOUNCE_MS = 400;

// Debounced, URL-driven (`?q=`) search box for admin list pages. Submitting always
// resets to page 1 (the `page` param is simply dropped from the target URL).
export function AdminSearchForm({
  basePath,
  initialQuery,
  placeholder,
  label,
}: {
  basePath: string;
  initialQuery: string;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="flex max-w-sm gap-2"
    >
      <label htmlFor="admin-search" className="sr-only">
        {label}
      </label>
      <Input
        id="admin-search"
        name="q"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
      <Button type="submit">Hledat</Button>
    </form>
  );
}
