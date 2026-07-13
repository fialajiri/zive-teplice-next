import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Authenticated pages are never cached.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Logged out → to login, returning here afterwards.
  if (!session) {
    redirect(`/prihlaseni?callbackUrl=${encodeURIComponent("/admin")}`);
  }

  // Logged in but not an admin → send to their own area (NOT back to login,
  // which would bounce through callbackUrl and loop).
  if (session.user.role !== "admin") {
    redirect("/ucet");
  }

  return <>{children}</>;
}
