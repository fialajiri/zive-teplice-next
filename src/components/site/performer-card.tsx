import Image from "next/image";
import Link from "next/link";
import type { PerformerDto } from "@/server/domain/performer";

export function PerformerCard({ performer }: { performer: PerformerDto }) {
  return (
    <article className="border-border/60 bg-card group flex flex-col overflow-hidden rounded-xl border">
      <Link
        href={`/ucinkujici/${performer.id}`}
        className="flex flex-1 flex-col"
      >
        <div className="bg-muted relative aspect-[4/3] overflow-hidden">
          {performer.image ? (
            <Image
              src={performer.image.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 309px, (min-width: 640px) calc(50vw - 36px), calc(100vw - 48px)"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="group-hover:text-primary font-semibold transition-colors">
            {performer.username}
          </h3>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {performer.description}
          </p>
        </div>
      </Link>
    </article>
  );
}
