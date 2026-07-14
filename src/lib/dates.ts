import { format } from "date-fns";
import { cs } from "date-fns/locale";

// Czech-formatted dates for the public site. Inputs are ISO strings from DTOs.
export function formatCzechDate(iso: string): string {
  return format(new Date(iso), "d. MMMM yyyy", { locale: cs });
}

// [start, end) ISO bounds covering the given calendar year in UTC.
export function yearDateRange(year: number): [string, string] {
  const start = new Date(Date.UTC(year, 0, 1)).toISOString();
  const end = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
  return [start, end];
}
