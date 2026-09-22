"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, useServerPagination, type PagedResult } from "@/components/shared/Pagination";
import { Select } from "@/components/shared/Select";
import { Loader } from "@/components/shared/Loader";
import { listUsers, type AdminUser, type AdminUsersPage, type ListUsersFilters } from "@/lib/api/users";
import { ApiRequestError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { UserDetailModal } from "./UserDetailModal";

const ROLE_OPTIONS = [
  { value: "", label: "ყველა" },
  { value: "USER", label: "მომხმარებელი" },
  { value: "ADMIN", label: "ადმინი" },
  { value: "OPERATOR", label: "ოპერატორი" },
];

const ROLE_LABELS: Record<AdminUser["role"], string> = {
  USER: "მომხმარებელი",
  ADMIN: "ადმინი",
  OPERATOR: "ოპერატორი",
};

const CUSTOMER_TYPE_OPTIONS = [
  { value: "", label: "ყველა" },
  { value: "WALK_IN", label: "სტუმარი" },
  { value: "REGISTERED", label: "დარეგისტრირებული" },
  { value: "MERGED", label: "შერწყმული" },
];

function methodBadges(user: AdminUser) {
  const methods: string[] = [];
  if (user.hasPassword) methods.push("პაროლი");
  if (user.hasGoogle) methods.push("Google");
  if (user.hasFacebook) methods.push("Facebook");

  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.map((method) => (
        <span
          key={method}
          className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
        >
          {method}
        </span>
      ))}
    </div>
  );
}

function nameWithStatusBadges(user: AdminUser) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>{user.name}</span>
      {user.isWalkIn && (
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
          სტუმარი
        </span>
      )}
      {user.mergedIntoUserId != null && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          შერწყმულია
        </span>
      )}
    </div>
  );
}

const columns: DataTableColumn<AdminUser>[] = [
  { header: "სახელი", render: (user) => nameWithStatusBadges(user) },
  { header: "ელფოსტა", render: (user) => user.email, cellClassName: "text-muted-foreground" },
  {
    header: "ტელეფონი",
    render: (user) => user.phone ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "როლი",
    render: (user) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          user.role === "ADMIN"
            ? "bg-primary/15 text-primary"
            : user.role === "OPERATOR"
              ? "bg-amber-500/15 text-amber-600"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {ROLE_LABELS[user.role]}
      </span>
    ),
  },
  { header: "ავტორიზაცია", render: (user) => methodBadges(user) },
  {
    header: "რეგისტრირებულია",
    render: (user) => formatDateTime(user.createdAt),
    cellClassName: "text-muted-foreground",
  },
];

export function UsersManager({ initialData }: { initialData: AdminUsersPage }) {
  const { data, totalPages, loading, load } = useServerPagination<AdminUser>({
    items: initialData.users,
    total: initialData.total,
    page: initialData.page,
    pageSize: initialData.pageSize,
  });
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [customerType, setCustomerType] = useState("");

  const hasActiveFilters = search.trim() !== "" || role !== "" || customerType !== "";

  function currentFilters(): ListUsersFilters {
    return {
      search: search.trim() || undefined,
      role: (role || undefined) as ListUsersFilters["role"],
      customerType: (customerType || undefined) as ListUsersFilters["customerType"],
    };
  }

  // listUsers' {users,...} envelope is remapped into useServerPagination's
  // {items,...} shape here — the API response shape itself is unchanged.
  async function fetchUsersPage(
    filters: ListUsersFilters,
    page: number,
  ): Promise<PagedResult<AdminUser>> {
    const result = await listUsers({ ...filters, page, pageSize: data.pageSize });
    return { items: result.users, total: result.total, page: result.page, pageSize: result.pageSize };
  }

  function onLoadError(error: unknown) {
    toast.error(error instanceof ApiRequestError ? error.message : "მომხმარებლების ჩატვირთვა ვერ მოხერხდა");
  }

  function handleApplyFilters() {
    load(() => fetchUsersPage(currentFilters(), 1), onLoadError);
  }

  function handleClearFilters() {
    setSearch("");
    setRole("");
    setCustomerType("");
    load(() => fetchUsersPage({}, 1), onLoadError);
  }

  function loadPage(page: number) {
    load(() => fetchUsersPage(currentFilters(), page), onLoadError);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">მომხმარებლები</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            საიტზე დარეგისტრირებული მომხმარებლების სია — სულ {data.total}.
          </p>
        </div>
        {loading && <Loader size="sm" label="იტვირთება" />}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="users-filter-search" className="text-xs font-medium text-muted-foreground">
            ძებნა
          </label>
          <input
            id="users-filter-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="სახელი, გვარი, ემეილი ან ტელეფონი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="users-filter-role" className="text-xs font-medium text-muted-foreground">
            როლი
          </label>
          <Select id="users-filter-role" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        </div>
        <div className="flex w-48 flex-col gap-1.5">
          <label htmlFor="users-filter-customer-type" className="text-xs font-medium text-muted-foreground">
            ტიპი
          </label>
          <Select
            id="users-filter-customer-type"
            options={CUSTOMER_TYPE_OPTIONS}
            value={customerType}
            onChange={setCustomerType}
          />
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

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(user) => user.id}
          emptyMessage="მომხმარებელი არ არსებობს"
          actions={(user) => (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewingUserId(user.id)}
                aria-label="სრულად ნახვა"
                title="სრულად ნახვა"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          )}
        />
        <Pagination currentPage={data.page} totalPages={totalPages} onPageChange={loadPage} />
      </div>

      {viewingUserId != null && (
        <UserDetailModal
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onRoleChanged={() => loadPage(data.page)}
        />
      )}
    </div>
  );
}
