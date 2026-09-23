// crypto.randomUUID() is only available in secure contexts (HTTPS or
// localhost) — browsers throw "crypto.randomUUID is not a function"
// everywhere else, which is exactly what happened on the plain-HTTP VPS
// during this app's pre-domain testing phase (see DEPLOY.md), while working
// fine locally (localhost always counts as secure). crypto.getRandomValues()
// has no such restriction, so this falls back to a manual UUIDv4 built from
// it whenever randomUUID isn't available.
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
