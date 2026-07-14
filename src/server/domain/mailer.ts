import type { Result } from "./result";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
};

// Outbound email port. Returns a typed Result instead of throwing across layers
// so each caller decides whether a failure is fatal (password reset — the user
// is stuck) or best-effort (participation decision — don't roll back the
// decision). Zero provider/framework deps; the adapter lives in infrastructure.
export type Mailer = {
  send(message: MailMessage): Promise<Result<void>>;
};
