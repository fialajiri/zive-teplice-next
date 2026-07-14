import type { Metadata } from "next";
import Link from "next/link";
import { GalleryCreateForm } from "@/components/admin/gallery-create-form";

export const metadata: Metadata = {
  title: "Nová galerie — administrace",
};

export default function NewGalleryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/galerie"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Zpět na galerie
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nová galerie
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Zadejte název a úvodní obrázek. Fotky nahrajete v dalším kroku.
        </p>
      </div>
      <GalleryCreateForm />
    </div>
  );
}
