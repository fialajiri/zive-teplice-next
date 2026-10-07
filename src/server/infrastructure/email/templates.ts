// Plain email templates — pure functions returning `{ subject, html }`. Czech
// copy carried over from the legacy backend (controllers/auth.js, users.js),
// with typos fixed. No provider/framework deps so they're trivially testable.

import type { MailMessage } from "@/server/domain/mailer";

export type EmailContent = Pick<MailMessage, "subject" | "html">;

// The reset link. `resetUrl` is built server-side from the app's own origin +
// the single-use token (a random hex value) — never a hard-coded host, never
// client input, so it is safe to interpolate into the href.
export function passwordResetEmail(resetUrl: string): EmailContent {
  return {
    subject: "Reset hesla – Živé Teplice",
    html: [
      "<p>Vyžádali jste si obnovení hesla k účtu na Živých Teplicích.</p>",
      `<p>Klikněte na tento <a href="${resetUrl}">odkaz</a> pro nastavení nového hesla. Platnost odkazu je 1 hodina.</p>`,
      "<p>Pokud jste o obnovení hesla nežádali, tento e-mail ignorujte.</p>",
      "<p>S pozdravem<br />tým Živých Teplic</p>",
    ].join("\n"),
  };
}

// The participation decision. No dynamic input — the branch is chosen by the
// admin's decision, so there is nothing to escape.
export function participationDecisionEmail(
  decision: "approved" | "rejected",
): EmailContent {
  const body =
    decision === "approved"
      ? "Gratulujeme, Vaše přihláška na Živé Teplice byla schválena."
      : "Je nám líto, ale Vaše přihláška na Živé Teplice byla zamítnuta.";
  return {
    subject: "Přihláška na Živé Teplice",
    html: `<p>${body}</p>\n<p>S pozdravem<br />tým Živých Teplic</p>`,
  };
}

// Sent right after a performer registers. No dynamic input — the only branch is
// whether registration also auto-requested participation in the current ročník.
export function registrationConfirmationEmail(
  participationRequested: boolean,
): EmailContent {
  const next = participationRequested
    ? "Zároveň jsme přijali Vaši přihlášku na letošní Živé Teplice. Jakmile ji posoudíme, dáme Vám vědět e-mailem."
    : "Přihlášku na Živé Teplice můžete odeslat ze svého účtu, jakmile bude vypsán nový ročník.";
  return {
    subject: "Registrace na Živé Teplice",
    html: [
      "<p>Děkujeme za registraci na Živých Teplicích, Váš účet byl úspěšně vytvořen.</p>",
      `<p>${next}</p>`,
      "<p>S pozdravem<br />tým Živých Teplic</p>",
    ].join("\n"),
  };
}
