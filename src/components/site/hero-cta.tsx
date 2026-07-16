import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { EventDto } from "@/server/domain/event";

// Extracted out of the homepage so both the real Suspense fallback and the
// admin content-preview pane render the exact same markup — this data (the
// current event, whether registration is open) is not admin-editable content.
export function HeroCta({
  currentEvent,
  registrationOpen,
}: {
  currentEvent: EventDto | null;
  registrationOpen: boolean;
}) {
  return (
    <>
      <p className="max-w-2xl text-lg text-balance text-white/90">
        {currentEvent
          ? `Sousedská slavnost v Šanovském parku u Mušle. Aktuální ročník: ${currentEvent.title} (${currentEvent.year}).`
          : "Sousedská slavnost v Šanovském parku u Mušle, Teplice."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/program" className={buttonVariants({ size: "lg" })}>
          Program
        </Link>
        <Link
          href="/galerie"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Galerie
        </Link>
        {registrationOpen ? (
          <Link
            href="/registrace"
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            Registrace účinkujících
          </Link>
        ) : null}
      </div>
    </>
  );
}
