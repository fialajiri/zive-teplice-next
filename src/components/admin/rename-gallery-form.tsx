"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { renameGalleryAction } from "@/server/actions/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Click-to-edit gallery title: the <h1> toggles into an inline input + save/cancel
// on click, matching the useTransition + toast pattern of the other admin forms.
export function RenameGalleryForm({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleEdit() {
    setValue(name);
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function handleCancel() {
    setEditing(false);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await renameGalleryAction(id, value);
      if (!result.ok) {
        setError(result.fieldErrors?.name?.[0] ?? result.error);
        return;
      }
      setEditing(false);
      toast.success("Galerie byla přejmenována.");
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleEdit}
          aria-label="Přejmenovat galerii"
        >
          <PencilIcon />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor="gallery-name" className="sr-only">
          Název galerie
        </label>
        <Input
          ref={inputRef}
          id="gallery-name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "gallery-name-error" : undefined}
          className="max-w-xs text-lg font-semibold"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label="Uložit název"
        >
          <CheckIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          onClick={handleCancel}
          aria-label="Zrušit úpravu"
        >
          <XIcon />
        </Button>
      </div>
      {error ? (
        <p
          id="gallery-name-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
