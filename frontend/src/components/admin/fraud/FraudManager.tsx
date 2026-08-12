"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { ApiRequestError } from "@/lib/api/client";
import { getSuspiciousLoginActivity, type SuspiciousLoginActivity } from "@/lib/api/fraud";

type EmailRow = SuspiciousLoginActivity["byEmail"][number];
type IpRow = SuspiciousLoginActivity["byIp"][number];

const emailColumns: DataTableColumn<EmailRow>[] = [
  { header: "ელფოსტა", render: (row) => row.email },
  {
    header: "წარუმატებელი მცდელობა",
    render: (row) => row.count,
    cellClassName: "font-semibold text-amber-600",
  },
];

const ipColumns: DataTableColumn<IpRow>[] = [
  { header: "IP მისამართი", render: (row) => row.ipAddress },
  {
    header: "წარუმატებელი მცდელობა",
    render: (row) => row.count,
    cellClassName: "font-semibold text-amber-600",
  },
];

export function FraudManager({ initialActivity }: { initialActivity: SuspiciousLoginActivity }) {
  const [activity, setActivity] = useState(initialActivity);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      setActivity(await getSuspiciousLoginActivity());
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
          <h1 className="text-2xl font-bold tracking-tight">თაღლითობის მონიტორინგი</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            საეჭვო login აქტივობა ბოლო {activity.windowMinutes} წუთში — {activity.threshold}+
            წარუმატებელი მცდელობა. შეკვეთების დროშები ცალკე ჩანს „შეკვეთები” გვერდზე, „მხოლოდ
            დროშიანი” ფილტრით.
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

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">საეჭვო ანგარიშები (email)</h2>
          <div className="mt-4">
            <DataTable
              columns={emailColumns}
              data={activity.byEmail}
              getRowKey={(row) => row.email}
              emptyMessage="საეჭვო აქტივობა არ არის"
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight">საეჭვო IP მისამართები</h2>
          <div className="mt-4">
            <DataTable
              columns={ipColumns}
              data={activity.byIp}
              getRowKey={(row) => row.ipAddress}
              emptyMessage="საეჭვო აქტივობა არ არის"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
