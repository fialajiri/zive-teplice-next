import { format } from "date-fns";
import { cs } from "date-fns/locale";

// Czech-formatted dates for the public site. Inputs are ISO strings from DTOs.
export function formatCzechDate(iso: string): string {
  return format(new Date(iso), "d. MMMM yyyy", { locale: cs });
}
