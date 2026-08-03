// Process-local in-memory cache — the API runs as a single Node process (no
// Redis/multi-instance setup in this project), so a plain Map is enough.
// Callers are responsible for invalidating their own keys on writes; `clear`
// wipes everything, used by the admin "clear cache" action.
const store = new Map<string, unknown>();

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
};
