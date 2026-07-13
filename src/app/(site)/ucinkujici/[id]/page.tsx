import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { container } from "@/server/container";
import { getPerformer } from "@/server/application/performers";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/ucinkujici/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = await getPerformer(container.performerRepository, id);
  if (!result.ok) return { title: "Účinkující nenalezen" };
  return {
    title: result.value.username,
    description: result.value.description.slice(0, 160),
  };
}

export default async function PerformerDetailPage({
  params,
}: PageProps<"/ucinkujici/[id]">) {
  const { id } = await params;
  const result = await getPerformer(container.performerRepository, id);
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(result.error.message);
  }
  const performer = result.value;

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/ucinkujici"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Zpět na účinkující
      </Link>
      <div className="mt-6 grid gap-8 sm:grid-cols-[minmax(0,16rem)_1fr]">
        {performer.image ? (
          <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-xl sm:aspect-square">
            <Image
              src={performer.image.imageUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 16rem, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {performer.username}
          </h1>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {performer.description}
          </p>
        </div>
      </div>
    </article>
  );
}
