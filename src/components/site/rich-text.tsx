import { sanitizeRichText } from "@/lib/sanitize-html";

// Stored WYSIWYG HTML. dangerouslySetInnerHTML is unavoidable for rich text, so the
// content is sanitized first (see sanitize-html.ts) — never render `message` raw.
export function RichText({ html }: { html: string }) {
  return (
    <div
      className="[&_a]:text-primary max-w-none space-y-4 leading-relaxed [&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}
