// Every fixture this suite creates gets an "E2E " name prefix with a unique
// suffix, so a crashed run's leftovers are easy to spot and sweep manually,
// and parallel/repeat runs never collide on a unique field (slug, SKU, etc).
export function uniqueTestName(label: string): string {
  return `E2E ${label} ${Date.now()}`;
}

export function uniqueTestEmail(): string {
  return `e2e-${Date.now()}@example.com`;
}
