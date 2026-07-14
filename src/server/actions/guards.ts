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

// The authenticated identity a self-or-admin write path may rely on.
export type SelfIdentity = { id: string; isAdmin: boolean };

// Per-record authorization: the action is allowed for the record's OWNER or an
// admin (gotcha #5). Identity comes only from the trusted session — never a
// client-supplied id. `targetId` is the record the caller is trying to touch.
export async function requireSelfOrAdmin(
  targetId: string,
): Promise<Result<SelfIdentity, ForbiddenError>> {
  const session = await auth();
  if (!session) return err({ kind: "forbidden" });

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && session.user.id !== targetId) {
    return err({ kind: "forbidden" });
  }
  return ok({ id: session.user.id, isAdmin });
}
