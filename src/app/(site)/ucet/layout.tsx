import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Authenticated pages are never cached.
export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Any signed-in role may access their account; only guard against logged-out.
  if (!session) {
    redirect(`/prihlaseni?callbackUrl=${encodeURIComponent("/ucet")}`);
  }

  return <>{children}</>;
}
