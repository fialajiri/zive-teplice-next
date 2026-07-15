// Next.js gives repeated search params (`?page=1&page=2`) as an array — pages only
// ever care about the first occurrence.
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Window of page numbers around `current`, with "…" gaps — 1 … c-1 c c+1 … last.
export function pageWindow(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1]! > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

// Builds `basePath?param=value&...&page=N`, omitting `page` on page 1.
export function pageHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  if (page > 1) qs.set("page", String(page));
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}
