import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { container } from "@/server/container";
import { getRegistrationOpen } from "@/server/application/settings";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata: Metadata = {
  title: "Registrace účinkujícího",
};

// The gate is read at request time; never statically cache the closed/open state.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Already signed in → no reason to register.
  const session = await auth();
  if (session) {
    redirect(session.user.role === "admin" ? "/admin" : "/ucet");
  }

  const registrationOpen = await getRegistrationOpen(
    container.settingsRepository,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Registrace účinkujícího
        </h1>
        <p className="text-muted-foreground text-sm">
          Vytvořte si účet a přihlaste se k účasti v aktuálním ročníku.
        </p>
      </div>

      {registrationOpen ? (
        <RegistrationForm />
      ) : (
        <div className="border-border/60 flex flex-col gap-2 rounded-lg border p-4 text-center">
          <p className="text-sm font-medium">
            Registrace je momentálně uzavřená
          </p>
          <p className="text-muted-foreground text-sm">
            Přijímání nových přihlášek účinkujících je právě pozastaveno. Zkuste
            to prosím později.
          </p>
        </div>
      )}

      <p className="text-muted-foreground text-center text-sm">
        Máte už účet?{" "}
        <Link href="/prihlaseni" className="text-foreground underline">
          Přihlaste se
        </Link>
      </p>
    </div>
  );
}
