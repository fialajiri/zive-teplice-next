import "server-only";
import { auth } from "@/auth";
import { err, ok, type Result } from "@/server/domain/result";

// The authenticated admin identity a guarded entry point may rely on. Only the
// bits derived from the trusted session — never a client-supplied role.
export type AdminIdentity = { id: string };

export type ForbiddenError = { kind: "forbidden" };

// Shared authorization gate for every admin write path (server actions AND the
// presign route handler). Server actions and route handlers are directly
// invokable HTTP endpoints, so each must authorize itself — rendering the UI
// behind an admin layout is not a security boundary.
export async function requireAdmin(): Promise<
  Result<AdminIdentity, ForbiddenError>
> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return err({ kind: "forbidden" });
  }
  return ok({ id: session.user.id });
}
