import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = {
  title: "Nový ročník — administrace",
};

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/rocniky"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Zpět na ročníky
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nový ročník
        </h1>
      </div>
      <EventForm mode="create" />
    </div>
  );
}
