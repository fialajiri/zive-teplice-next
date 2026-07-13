import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function SiteNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold">Stránka nenalezena</h1>
      <p className="text-muted-foreground">
        Požadovaná stránka neexistuje nebo byla odstraněna.
      </p>
      <Link href="/" className={buttonVariants()}>
        Zpět na úvod
      </Link>
    </div>
  );
}
