/** The name to greet someone by: their own name, else the start of their email. Accounts made with a phone number
 * have an email like "201012345678@..." whose start is only the number: then there is no name (null). */
export function displayName(fullName: string | null | undefined, email: string | null | undefined): string | null {
  const own = fullName?.trim();
  if (own) return own;
  const start = (email ?? '').split('@')[0].trim();
  return !start || /^\+?\d+$/.test(start) ? null : start;
}
