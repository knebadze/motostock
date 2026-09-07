"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getVisitorOverview, type VisitorOverview } from "@/lib/api/visitors";
import { ApiRequestError } from "@/lib/api/client";
import { VisitorTrendChart } from "./VisitorTrendChart";

export function VisitorsManager({ initialData }: { initialData: VisitorOverview }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      setData(await getVisitorOverview());
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ვიზიტორები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            საიტის აქტიური ვიზიტორები და ბოლო 7 დღის სტატისტიკა — მოიცავს დალოგინებულ
            მომხმარებლებსაც და სტუმრებსაც (guest cookie-ით).
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {loading ? "..." : "განახლება"}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">აქტიური ახლა</p>
          <p className="mt-1 text-2xl font-bold text-primary">{data.activeNow}</p>
          <p className="mt-1 text-xs text-muted-foreground">ბოლო 5 წუთში აქტიური</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">დღეს</p>
          <p className="mt-1 text-2xl font-bold">{data.todayVisitors}</p>
          <p className="mt-1 text-xs text-muted-foreground">უნიკალური ვიზიტორი</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">ბოლო 7 დღე</p>
          <p className="mt-1 text-2xl font-bold">{data.weekVisitors}</p>
          <p className="mt-1 text-xs text-muted-foreground">უნიკალური ვიზიტორი</p>
        </div>
      </div>

      <div className="mt-6">
        <VisitorTrendChart data={data.dailySeries} />
      </div>
    </div>
  );
}
