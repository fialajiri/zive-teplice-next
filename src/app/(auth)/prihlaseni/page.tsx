import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Přihlášení",
};

type SearchParams = {
  callbackUrl?: string | string[];
  registrace?: string | string[];
  obnova?: string | string[];
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const callbackUrl = firstParam(params.callbackUrl);
  const registered = firstParam(params.registrace) === "ok";
  const passwordReset = firstParam(params.obnova) === "ok";

  // Already signed in → skip the form.
  const session = await auth();
  if (session) {
    redirect(
      callbackUrl ?? (session.user.role === "admin" ? "/admin" : "/ucet"),
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Živé Teplice
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Přihlášení</h1>
        <p className="text-muted-foreground text-sm">
          Přihlaste se ke svému účtu.
        </p>
      </div>

      {registered ? (
        <p
          role="status"
          className="border-border/60 bg-muted/40 rounded-lg border px-3 py-2 text-center text-sm"
        >
          Registrace proběhla úspěšně. Přihlaste se prosím svými údaji.
        </p>
      ) : null}

      {passwordReset ? (
        <p
          role="status"
          className="border-border/60 bg-muted/40 rounded-lg border px-3 py-2 text-center text-sm"
        >
          Heslo bylo změněno. Přihlaste se prosím novým heslem.
        </p>
      ) : null}

      <LoginForm callbackUrl={callbackUrl} />

      <div className="flex flex-col gap-2 text-center">
        <p className="text-muted-foreground text-sm">
          <Link href="/obnova-hesla" className="text-foreground underline">
            Zapomenuté heslo?
          </Link>
        </p>
        <p className="text-muted-foreground text-sm">
          Chcete se přihlásit jako účinkující?{" "}
          <Link href="/registrace" className="text-foreground underline">
            Zaregistrovat se
          </Link>
        </p>
      </div>
    </div>
  );
}
