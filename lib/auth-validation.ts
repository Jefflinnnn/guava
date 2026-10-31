// Shared by the auth forms (live validation) and the auth Server Actions.

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NAME_MAX = 40;
export const EMAIL_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The field error for an email, or "" when it's fine. */
export function emailError(email: string): string {
  const v = email.trim();
  if (!v) return "Enter your email.";
  if (!EMAIL_RX.test(v)) return "That doesn’t look like a valid email.";
  return "";
}

export const PASSWORD_RULES = [
  { label: "8+ characters", test: (pw: string) => pw.length >= PASSWORD_MIN },
  { label: "A letter", test: (pw: string) => /[a-z]/i.test(pw) },
  { label: "A number", test: (pw: string) => /\d/.test(pw) },
] as const;

export function passwordOk(pw: string): boolean {
  return pw.length <= PASSWORD_MAX && PASSWORD_RULES.every((r) => r.test(pw));
}
