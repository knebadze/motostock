"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listCache, type CacheEntry } from "@/lib/api/cache";
import { ApiRequestError } from "@/lib/api/client";
import type { Settings } from "@/lib/api/settings";

// `now` only ever drives the countdown text below, recomputed from each
// entry's already-fetched `expiresAt` — a permanent entry needs no
// server round-trip just to keep its remaining-time column live.
function formatRemaining(expiresAt: number | null, now: number): string {
  if (expiresAt == null) return "სამუდამო";

  const remainingMs = expiresAt - now;
  if (remainingMs <= 0) return "ვადა გავიდა";

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}წთ ${seconds}წმ` : `${seconds}წმ`;
}

export function CacheTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [ttlDraft, setTtlDraft] = useState(settings.homepageCacheTtlMinutes);

  async function load() {
    setLoading(true);
    try {
      const result = await listCache();
      setEntries(result.entries);
      setNow(Date.now());
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ქეშის სია ვერ ჩაიტვირთა");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Deferred via setTimeout (same idiom CheckoutManager's preview effect
    // uses) so the loading-state setState isn't called synchronously in the
    // effect body itself. Fetches once on mount — Tabs keeps every tab's
    // content mounted (just hidden), so this won't silently re-fire on tab
    // switches; the refresh button below covers staleness after the central
    // "clear cache" action.
    const timeoutId = setTimeout(load, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Ticks the "ვადა" column's countdown once a second — purely a local
    // re-render (recomputes formatRemaining against each entry's already-
    // fetched expiresAt), no extra request. An entry that actually expires
    // server-side just needs the "განახლება" button (or the next mount) to
    // disappear from the list — this timer only keeps the displayed
    // countdown honest in between.
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border p-5">
        <p className="font-medium text-foreground">ქეშის ვადა</p>
        <p className="mt-1 text-sm text-muted-foreground">
          რამდენ ხანს ინახება მთავარი გვერდის პოპულარული/ფასდაკლებული პროდუქტების და
          რეკომენდაციების გამოთვლილი სია, სანამ თავისით არ განახლდება.
        </p>

        <div className="mt-4 flex flex-col gap-1.5 sm:w-1/3">
          <label className="text-sm font-medium">ვადა (წუთი)</label>
          <input
            type="number"
            min={1}
            value={ttlDraft}
            onChange={(event) => setTtlDraft(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => onSave({ ...settings, homepageCacheTtlMinutes: ttlDraft })}
          disabled={saving}
          className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          შენახვა
        </button>
      </div>

      <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">ქეშის შემცველობა</p>
          <p className="mt-1 text-sm text-muted-foreground">
            სერვერის მეხსიერებაში ამჟამად შენახული key-ები — კლასიფიკატორები/პარამეტრები (ხელით
            იწმინდება ცვლილებაზე) და მთავარი გვერდის/რეკომენდაციების გამოთვლილი სიები (თავისით
            ვადაგასული, ზემოთ მითითებული ვადით) — სულ {entries.length} ჩანაწერი.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {loading ? "იტვირთება..." : "განახლება"}
        </button>
      </div>

      {!loading && entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">ქეში ცარიელია.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">ვადა</th>
                <th className="py-2 font-medium">მნიშვნელობა</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.key} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 align-top font-mono text-xs whitespace-nowrap">{entry.key}</td>
                  <td className="py-2 pr-4 align-top text-xs whitespace-nowrap">
                    {entry.expiresAt == null ? (
                      <span className="text-muted-foreground">სამუდამო</span>
                    ) : (
                      <span
                        className={
                          entry.expiresAt - now <= 0
                            ? "text-muted-foreground"
                            : "font-medium text-primary"
                        }
                      >
                        {formatRemaining(entry.expiresAt, now)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 align-top text-xs break-all text-muted-foreground">
                    {entry.valuePreview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
