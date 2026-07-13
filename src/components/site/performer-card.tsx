import Image from "next/image";
import Link from "next/link";
import type { PerformerDto } from "@/server/domain/performer";

const TYPE_LABEL: Record<PerformerDto["type"], string> = {
  prodejce: "Prodejce",
  umělec: "Umělec",
};

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
              sizes="(min-width: 768px) 33vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="group-hover:text-primary font-semibold transition-colors">
              {performer.username}
            </h3>
            <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs">
              {TYPE_LABEL[performer.type]}
            </span>
          </div>
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {performer.description}
          </p>
        </div>
      </Link>
    </article>
  );
}
