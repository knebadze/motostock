// Mirrors backend/src/lib/password.ts's newPasswordField — new passwords use
// Latin letters, digits and symbols only (no Georgian/Cyrillic letters), at
// most 72 characters (bcrypt's real limit). Checked here first so the user
// gets a clear message instead of a generic validation error from the API.
export const MAX_PASSWORD_LENGTH = 72;

export function isPasswordTooLong(password: string): boolean {
  return password.length > MAX_PASSWORD_LENGTH;
}

export function hasInvalidPasswordChars(password: string): boolean {
  return !/^[\x20-\x7E]*$/.test(password);
}
