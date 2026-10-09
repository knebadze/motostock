"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Loader } from "@/components/shared/Loader";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import {
  getScheduledJobs,
  getScheduledJobRuns,
  triggerScheduledJob,
  type ScheduledJobDefinition,
  type ScheduledJobKey,
  type ScheduledJobRun,
  type ScheduledJobRunsPage,
} from "@/lib/api/scheduled-jobs";
import type { FinaSyncRun } from "@/lib/api/fina-sync";
import { FinaSyncStatusBadge } from "@/components/admin/fina-sync/FinaSyncStatusBadge";
import { ScheduledJobStatusBadge, SCHEDULED_JOB_TRIGGER_LABEL } from "./ScheduledJobStatusBadge";

const ALL_JOBS = "ALL" as const;

function toPagedResult(page: ScheduledJobRunsPage): PagedResult<ScheduledJobRun> {
  return { items: page.runs, total: page.total, page: page.page, pageSize: page.pageSize };
}

function detailTitle(run: ScheduledJobRun | null): string | undefined {
  if (!run?.detail) return undefined;
  return Object.entries(run.detail)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function ScheduledJobsManager({
  initialJobs,
  initialRuns,
  latestFinaSyncRun,
}: {
  initialJobs: ScheduledJobDefinition[];
  initialRuns: ScheduledJobRunsPage;
  latestFinaSyncRun: FinaSyncRun | null;
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [triggeringKey, setTriggeringKey] = useState<ScheduledJobKey | null>(null);
  const [selectedJobKey, setSelectedJobKey] = useState<ScheduledJobKey | typeof ALL_JOBS>(ALL_JOBS);
  const { data, totalPages, loading, load } = useServerPagination(toPagedResult(initialRuns));

  async function refreshRuns(jobKey: ScheduledJobKey | typeof ALL_JOBS, page = 1) {
    await load(
      () =>
        getScheduledJobRuns(jobKey === ALL_JOBS ? undefined : jobKey, page, data.pageSize).then(
          toPagedResult,
        ),
      (error) => {
        const message =
          error instanceof ApiRequestError ? error.message : "ისტორიის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
      },
    );
  }

  function handleSelectJob(jobKey: ScheduledJobKey | typeof ALL_JOBS) {
    setSelectedJobKey(jobKey);
    refreshRuns(jobKey, 1);
  }

  async function handleRunNow(key: ScheduledJobKey) {
    setTriggeringKey(key);
    try {
      await triggerScheduledJob(key);
      toast.success("დავალება დასრულდა");
      const [updatedJobs] = await Promise.all([getScheduledJobs(), refreshRuns(selectedJobKey, data.page)]);
      setJobs(updatedJobs);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "დავალების გაშვება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setTriggeringKey(null);
    }
  }

  const jobColumns: DataTableColumn<ScheduledJobDefinition>[] = [
    { header: "სახელი", render: (job) => job.labelKa },
    { header: "განრიგი", render: (job) => job.scheduleLabelKa, cellClassName: "text-muted-foreground" },
    {
      header: "ბოლო გაშვება",
      render: (job) => (job.lastRun ? formatDateTime(job.lastRun.startedAt) : "—"),
    },
    {
      header: "სტატუსი",
      render: (job) => (job.lastRun ? <ScheduledJobStatusBadge status={job.lastRun.status} /> : "—"),
    },
    {
      header: "წაშლილი",
      render: (job) => (
        <span title={detailTitle(job.lastRun)}>{job.lastRun?.itemsAffected ?? "—"}</span>
      ),
    },
  ];

  const runColumns: DataTableColumn<ScheduledJobRun>[] = [
    { header: "დრო", render: (run) => formatDateTime(run.startedAt) },
    { header: "ამოცანა", render: (run) => jobs.find((job) => job.key === run.jobKey)?.labelKa ?? run.jobKey },
    { header: "ტიპი", render: (run) => SCHEDULED_JOB_TRIGGER_LABEL[run.trigger] },
    { header: "სტატუსი", render: (run) => <ScheduledJobStatusBadge status={run.status} /> },
    {
      header: "წაშლილი",
      render: (run) => <span title={detailTitle(run)}>{run.itemsAffected ?? "—"}</span>,
    },
    {
      header: "გამშვები",
      render: (run) => (run.trigger === "MANUAL" ? (run.triggeredBy?.name ?? "—") : "—"),
    },
    {
      header: "შეცდომა",
      render: (run) => run.errorMessage ?? "—",
      cellClassName: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ავტომატური დავალებები</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ფონური, დროზე დაფუძნებული ამოცანები — ძველი/მიტოვებული მონაცემების რეგულარული გასუფთავება.
          თითოეული უშვებს ავტომატურად ყოველდღე, ან შეგიძლიათ ხელით გაუშვათ ახლავე.
        </p>
      </div>

      <Link
        href="/admin/fina-sync"
        className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
      >
        <div>
          <p className="font-semibold text-foreground">FINA სინქრონიზაცია</p>
          <p className="text-sm text-muted-foreground">
            საკუთარი, ადმინის Settings-ში კონფიგურირებადი ინტერვალით მუშაობს — სრული ისტორია ცალკე
            გვერდზეა.
          </p>
        </div>
        {latestFinaSyncRun && <FinaSyncStatusBadge status={latestFinaSyncRun.status} />}
      </Link>

      <div className="mt-6">
        <DataTable
          columns={jobColumns}
          data={jobs}
          getRowKey={(job) => job.key}
          emptyMessage="ამოცანები არ არის დარეგისტრირებული"
          actions={(job) => (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectJob(job.key)}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                ისტორია
              </button>
              <button
                type="button"
                onClick={() => handleRunNow(job.key)}
                disabled={triggeringKey !== null}
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {triggeringKey === job.key ? "მიმდინარეობს..." : "ახლავე გაუშვი"}
              </button>
            </div>
          )}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-foreground">გაშვების ისტორია</h2>
        <div className="flex items-center gap-2">
          {loading && <Loader size="sm" label="იტვირთება" />}
          <select
            value={selectedJobKey}
            onChange={(event) => handleSelectJob(event.target.value as ScheduledJobKey | typeof ALL_JOBS)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value={ALL_JOBS}>ყველა ამოცანა</option>
            {jobs.map((job) => (
              <option key={job.key} value={job.key}>
                {job.labelKa}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <DataTable
          columns={runColumns}
          data={data.items}
          getRowKey={(run) => run.id}
          emptyMessage="გაშვების ისტორია ჯერ არ არსებობს"
        />
      </div>

      <Pagination
        currentPage={data.page}
        totalPages={totalPages}
        onPageChange={(page) => refreshRuns(selectedJobKey, page)}
      />
    </div>
  );
}
