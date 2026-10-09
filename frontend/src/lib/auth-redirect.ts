// The ?redirect= param on /login and /register is attacker-controlled (a
// crafted /login?redirect=... link) — only a same-site relative path is
// accepted, to avoid an open redirect after a successful login. A single
// leading slash, NOT "//host" or "/\host" (browsers treat a backslash like a
// slash, so both are protocol-relative = another site), and no control
// characters. The backend's OAuth flow applies the same rule
// (oauth.controller.ts's isSafeRedirectPath) before carrying it through the
// provider round-trip.
export function isSafeRedirectPath(value: string | null | undefined): value is string {
  if (!value || value.length > 512) return false;
  if (!value.startsWith("/") || value[1] === "/" || value[1] === "\\") return false;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === "\\" || code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

export function resolveRedirectTarget(value: string | null | undefined): string {
  return isSafeRedirectPath(value) ? value : "/account";
}
