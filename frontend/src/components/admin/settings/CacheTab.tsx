"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listCache, type CacheEntry } from "@/lib/api/cache";
import { ApiRequestError } from "@/lib/api/client";

export function CacheTab() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const result = await listCache();
      setEntries(result.entries);
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

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">ქეშის შემცველობა</p>
          <p className="mt-1 text-sm text-muted-foreground">
            სერვერის მეხსიერებაში ამჟამად შენახული key-ები (კლასიფიკატორები, პარამეტრები და
            ა.შ.) — {entries.length} ჩანაწერი.
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
                <th className="py-2 font-medium">მნიშვნელობა</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.key} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 align-top font-mono text-xs whitespace-nowrap">{entry.key}</td>
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
  );
}
