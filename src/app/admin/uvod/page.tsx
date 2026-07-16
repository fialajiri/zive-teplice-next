import { container } from "@/server/container";
import { getHomepageContent } from "@/server/application/homepage-content";
import { HomepageContentForm } from "@/components/admin/homepage-content-form";

export default async function AdminHomepagePage() {
  const content = await getHomepageContent(container.homepageContentRepository);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl">Úvodní stránka</h1>
        <p className="text-muted-foreground text-sm">
          Upravte fotky a texty na úvodní stránce. Změny se na webu projeví až
          po uložení.
        </p>
      </div>
      <HomepageContentForm content={content} />
    </div>
  );
}
