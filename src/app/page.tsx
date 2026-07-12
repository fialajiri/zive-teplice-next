import { Button } from "@/components/ui/button";

// Phase 0 placeholder home page — proves the design system (Tailwind v4 tokens,
// shadcn Button, dark-mode variables) renders. Replaced by the real site in Phase 1.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="text-muted-foreground rounded-full border px-3 py-1 text-sm">
        zive-teplice-next · Phase 0
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Živé Teplice
      </h1>
      <p className="text-muted-foreground text-lg text-pretty">
        Combined Next.js 16 app scaffold is ready. Public site, admin, and API
        arrive in the next phases.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  );
}
