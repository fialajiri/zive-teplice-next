import "server-only";
import { Resend } from "resend";
import type { Mailer } from "@/server/domain/mailer";
import { err, ok, unexpected, type Result } from "@/server/domain/result";

// Resend adapter for the Mailer port. NEVER logs the recipient, subject, or body
// — only a provider error name — so no token/PII/link reaches the logs
// (gotcha #4/#6).
//
// Construction never throws: the `container` is built eagerly and imported by
// every page, so a missing key must not crash the app. Instead an unconfigured
// mailer returns a loud error on every `send` — callers already treat a send
// failure per-flow (best-effort for decisions, retryable for resets).
export function createResendMailer(): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      async send(): Promise<Result<void>> {
        console.error(
          "Mailer is not configured (RESEND_API_KEY / EMAIL_FROM missing).",
        );
        return err(unexpected("E-mail se nepodařilo odeslat."));
      },
    };
  }

  const resend = new Resend(apiKey);

  return {
    async send(message): Promise<Result<void>> {
      try {
        const { error } = await resend.emails.send({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
        });
        if (error) {
          // Only the provider error name — no address, subject, or body.
          console.error(`Mailer send failed: ${error.name}`);
          return err(unexpected("E-mail se nepodařilo odeslat."));
        }
        return ok(undefined);
      } catch {
        console.error("Mailer send threw unexpectedly.");
        return err(unexpected("E-mail se nepodařilo odeslat."));
      }
    },
  };
}
