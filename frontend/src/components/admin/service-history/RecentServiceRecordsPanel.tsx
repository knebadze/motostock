"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { DateInput } from "@/components/shared/DateInput";
import { Loader } from "@/components/shared/Loader";
import {
  listServiceRecordsAdmin,
  type AdminServiceRecord,
  type ListServiceRecordsAdminFilters,
  type ServiceRecordsAdminPage,
} from "@/lib/api/service-records";
import { ApiRequestError } from "@/lib/api/client";
import { formatDate, formatPrice, formatVehicleCatalogLabel } from "@/lib/format";
import type { ServiceType } from "@/lib/api/service-types";
import type { TeamMember } from "@/lib/api/team-members";

const POSITION_LABELS: Record<string, string> = {
  FRONT: "წინა",
  REAR: "უკანა",
  BOTH: "ორივე",
};

function serviceRecordName(record: AdminServiceRecord): string {
  return record.serviceTypeName?.ka ?? record.customServiceName ?? "";
}

function serviceRecordDetail(record: AdminServiceRecord): string | null {
  const parts: string[] = [];
  if (record.position) parts.push(POSITION_LABELS[record.position]);
  if (record.filterChanged) parts.push("ფილტრიც შეიცვალა");
  return parts.length > 0 ? parts.join(" · ") : null;
}

// Workshop "სერვისის ისტორია" screen's admin-wide overview — every
// customer's recently performed services in one filterable, paginated table,
// separate from the "search a customer → pick their vehicle" flow below it
// on the same page (that one only ever shows one vehicle's history at a
// time).
export function RecentServiceRecordsPanel({
  initialData,
  serviceTypes,
  teamMembers,
}: {
  initialData: ServiceRecordsAdminPage;
  serviceTypes: ServiceType[];
  teamMembers: TeamMember[];
}) {
  const { data, totalPages, loading, load } = useServerPagination<AdminServiceRecord>(initialData);
  const [search, setSearch] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [performedFrom, setPerformedFrom] = useState("");
  const [performedTo, setPerformedTo] = useState("");

  const hasActiveFilters =
    search.trim() !== "" ||
    serviceTypeId !== "" ||
    mechanicId !== "" ||
    performedFrom !== "" ||
    performedTo !== "";

  const serviceTypeOptions = [
    { value: "", label: "ყველა" },
    ...serviceTypes.map((type) => ({ value: String(type.id), label: type.name.ka })),
  ];
  const mechanicOptions = [
    { value: "", label: "ყველა" },
    ...teamMembers.map((member) => ({ value: String(member.id), label: member.name.ka })),
  ];

  function currentFilters(): ListServiceRecordsAdminFilters {
    return {
      search: search.trim() || undefined,
      serviceTypeId: serviceTypeId ? Number(serviceTypeId) : undefined,
      mechanicId: mechanicId ? Number(mechanicId) : undefined,
      performedFrom: performedFrom || undefined,
      performedTo: performedTo || undefined,
    };
  }

  async function fetchPage(
    filters: ListServiceRecordsAdminFilters,
    page: number,
  ): Promise<PagedResult<AdminServiceRecord>> {
    return listServiceRecordsAdmin({ ...filters, page, pageSize: data.pageSize });
  }

  function onLoadError(error: unknown) {
    toast.error(error instanceof ApiRequestError ? error.message : "სიის ჩატვირთვა ვერ მოხერხდა");
  }

  function handleApplyFilters() {
    load(() => fetchPage(currentFilters(), 1), onLoadError);
  }

  function handleClearFilters() {
    setSearch("");
    setServiceTypeId("");
    setMechanicId("");
    setPerformedFrom("");
    setPerformedTo("");
    load(() => fetchPage({}, 1), onLoadError);
  }

  function loadPage(page: number) {
    load(() => fetchPage(currentFilters(), page), onLoadError);
  }

  const columns: DataTableColumn<AdminServiceRecord>[] = [
    { header: "თარიღი", render: (record) => formatDate(record.performedAt) },
    { header: "მომხმარებელი", render: (record) => record.customerName },
    {
      header: "ტრანსპორტი",
      render: (record) =>
        `${formatVehicleCatalogLabel(record.vehicleCatalog)} (${record.garageVehicleYear})`,
      cellClassName: "text-muted-foreground",
    },
    { header: "სერვისი", render: (record) => serviceRecordName(record) },
    { header: "კილომეტრაჟი", render: (record) => `${record.mileageKm} კმ`, cellClassName: "text-muted-foreground" },
    {
      header: "ხელოსანი",
      render: (record) => record.mechanicName?.ka ?? "—",
      cellClassName: "text-muted-foreground",
    },
    {
      header: "ფასი",
      render: (record) => (record.price != null ? formatPrice(record.price) : "—"),
      cellClassName: "text-muted-foreground",
    },
    {
      header: "დეტალი",
      render: (record) => serviceRecordDetail(record) ?? "—",
      cellClassName: "text-muted-foreground",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight">ბოლოს ჩატარებული სერვისები</h2>
        {loading && <Loader size="sm" label="იტვირთება" />}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">ძებნა</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="მომხმარებელი ან სერვისის სახელი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">სერვისის ტიპი</label>
          <Select options={serviceTypeOptions} value={serviceTypeId} onChange={setServiceTypeId} />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">ხელოსანი</label>
          <Select options={mechanicOptions} value={mechanicId} onChange={setMechanicId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (დან)</label>
          <DateInput value={performedFrom} onChange={setPerformedFrom} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">თარიღი (მდე)</label>
          <DateInput value={performedTo} onChange={setPerformedTo} />
        </div>
        <button
          type="button"
          onClick={handleApplyFilters}
          disabled={loading}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          გაფილტვრა
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={loading}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
          >
            გაწმენდა
          </button>
        )}
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(record) => record.id}
          emptyMessage="სერვისის ჩანაწერი ჯერ არ არსებობს"
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>
    </div>
  );
}
