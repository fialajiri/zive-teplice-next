import DOMPurify from "isomorphic-dompurify";

// Rich-text bodies (news/program `message`) are stored as HTML. Sanitize before
// rendering so stored markup can never inject script/handlers. Allow only the
// formatting tags a WYSIWYG editor produces.
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
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
    // Force safe link behavior; block javascript: and data: URIs.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
  });
}
