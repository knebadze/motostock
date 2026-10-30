import { apiClient } from "./client";
import type { components } from "./generated/schema";

export type SearchSuggestions = components["schemas"]["SearchSuggestions"];

export const SEARCH_MIN_LENGTH = 2;

// The header's global search dropdown (HeaderSearch.tsx). `signal` lets the
// caller abort a request a newer keystroke has superseded.
export async function getSearchSuggestions(q: string, signal?: AbortSignal): Promise<SearchSuggestions> {
  const { data } = await apiClient.get<SearchSuggestions>("/search/suggest", { params: { q }, signal });
  return data;
}

// Recent searches — a per-browser convenience only (localStorage can be
// unavailable or throw: private mode, blocked storage), so every access is
// guarded and failures just mean "no history".
const RECENT_SEARCHES_KEY = "recent-searches";
const RECENT_SEARCHES_MAX = 6;

export function readRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH_MIN_LENGTH) return;
  try {
    const next = [trimmed, ...readRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())];
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next.slice(0, RECENT_SEARCHES_MAX)));
  } catch {
    // storage unavailable — nothing to remember
  }
}

export function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // storage unavailable
  }
}
