import sanitizeHtml from "sanitize-html";

// Rich-text bodies (news/program `message`) are stored as HTML. Sanitize before
// rendering so stored markup can never inject script/handlers. Allow only the
// formatting tags a WYSIWYG editor produces.
//
// Uses sanitize-html (parser-based) rather than DOMPurify/jsdom: jsdom's
// html-encoding-sniffer dependency pulls in a pure-ESM package that Turbopack's
// server bundling can't require() at runtime (ERR_REQUIRE_ESM in production).
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "span",
];

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    // Block javascript: and data: URIs; relative/hash hrefs pass through untouched.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    disallowedTagsMode: "discard",
  });
}
