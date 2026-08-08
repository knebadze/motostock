// Process-local in-memory cache — the API runs as a single Node process (no
// Redis/multi-instance setup in this project), so a plain Map is enough.
// Callers are responsible for invalidating their own keys on writes; `clear`
// wipes everything, used by the admin "clear cache" action.
const store = new Map<string, unknown>();

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
    return store.get(key) as T | undefined;
  },

  set<T>(key: string, value: T): void {
    store.set(key, value);
  },

  del(key: string): void {
    store.delete(key);
  },

  clear(): void {
    store.clear();
  },

  // Admin-only introspection (see cache.controller.ts's list handler) — not
  // used by any read-through cache logic, just lets the settings page's
  // cache tab show what's currently stored.
  list(): { key: string; valuePreview: string }[] {
    return Array.from(store.entries()).map(([key, value]) => ({
      key,
      valuePreview: previewValue(value),
    }));
  },
};
