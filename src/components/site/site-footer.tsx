export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border/60 mt-16 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col gap-1 px-6 py-8 text-sm">
        <p className="text-foreground font-medium">Živé Teplice</p>
        <p>
          Kulturní akce v Teplicích — aktuality, program, galerie a účinkující.
        </p>
        <p>© {year} Živé Teplice</p>
      </div>
    </footer>
  );
}
