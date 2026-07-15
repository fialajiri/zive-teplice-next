// Shared page-result shape for repository listPage()/search() methods.
export type Page<T> = { items: T[]; total: number };

export type PageParams = { page: number; pageSize: number };

// Row count per page for every admin list (aktuality, galerie, ročníky, účinkující).
export const ADMIN_PAGE_SIZE = 20;

// Clamps a raw `?page=` query value to a valid page number (defaults to 1).
export function clampPage(page: number | undefined): number {
  return Number.isInteger(page) && page! > 0 ? page! : 1;
}
