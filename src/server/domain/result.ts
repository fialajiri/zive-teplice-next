// Typed result object used across use cases instead of throwing across layers.
// Presentation maps `error.kind` to not-found / error UI.

// Per-field validation messages, keyed by input field name (Zod flatten shape).
export type FieldErrors = Record<string, string[]>;

export type DomainError =
  | { kind: "not_found"; message: string }
  | { kind: "validation"; message: string; fieldErrors?: FieldErrors }
  | { kind: "unexpected"; message: string };

export type Result<T, E = DomainError> =
  { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function notFound(message: string): DomainError {
  return { kind: "not_found", message };
}

export function validation(
  message: string,
  fieldErrors?: FieldErrors,
): DomainError {
  return { kind: "validation", message, fieldErrors };
}

export function unexpected(message: string): DomainError {
  return { kind: "unexpected", message };
}
