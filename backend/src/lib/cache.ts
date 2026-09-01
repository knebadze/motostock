// Process-local in-memory cache — the API runs as a single Node process (no
// Redis/multi-instance setup in this project), so a plain Map is enough.
// Two invalidation styles share this one store: most callers (settings,
// lookups, ...) invalidate their own keys explicitly on writes and never
// pass `ttlMs`, so `expiresAt` stays null and the entry lives until deleted
// or `clear`ed. Callers with no natural "on write" invalidation hook (e.g.
// the homepage's popular/on-sale product rankings, which shift with every
// order/discount change across several unrelated modules) pass `ttlMs`
// instead and just let entries go stale and expire on their own — simpler
// and safer than trying to wire explicit invalidation into every place that
// could affect the ranking. `clear` wipes everything, used by the admin
// "clear cache" action.
type Entry = { value: unknown; expiresAt: number | null };
const store = new Map<string, Entry>();

const PREVIEW_LENGTH = 150;

function previewValue(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (json == null) return String(value);
    return json.length > PREVIEW_LENGTH ? `${json.slice(0, PREVIEW_LENGTH)}…` : json;
  } catch {
    return "[სერიალიზაცია ვერ მოხერხდა]";
  }
}

export const cache = {
  get<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt != null && Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.value as T;
  },

  set<T>(key: string, value: T, ttlMs?: number): void {
    store.set(key, { value, expiresAt: ttlMs != null ? Date.now() + ttlMs : null });
  },

  del(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },

  // Admin-only introspection (see cache.controller.ts's list handler) — not
  // used by any read-through cache logic, just lets the settings page's
  // cache tab show what's currently stored. Skips (and evicts) anything
  // that's already expired rather than showing a stale ghost entry.
  // `expiresAt` (epoch ms, null for a permanent/explicit-invalidation entry)
  // is returned as-is rather than a pre-computed "remaining time" string —
  // the admin UI ticks its own countdown from it instead of needing to
  // re-fetch this list every second just to keep a duration display fresh.
  list(): { key: string; valuePreview: string; expiresAt: number | null }[] {
    const now = Date.now();
    const entries: { key: string; valuePreview: string; expiresAt: number | null }[] = [];
    for (const [key, entry] of store) {
      if (entry.expiresAt != null && now > entry.expiresAt) {
        store.delete(key);
        continue;
      }
      entries.push({ key, valuePreview: previewValue(entry.value), expiresAt: entry.expiresAt });
    }
    return entries;
  },
};
