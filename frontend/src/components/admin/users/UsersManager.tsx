"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import type { AdminUser } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

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

const columns: DataTableColumn<AdminUser>[] = [
  { header: "სახელი", render: (user) => user.name },
  { header: "ელფოსტა", render: (user) => user.email, cellClassName: "text-muted-foreground" },
  {
    header: "როლი",
    render: (user) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          user.role === "ADMIN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {user.role === "ADMIN" ? "ადმინი" : "მომხმარებელი"}
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

export function UsersManager({ initialUsers }: { initialUsers: AdminUser[] }) {
  const { page, setPage, pageItems, totalPages } = usePagination(initialUsers);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მომხმარებლები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        საიტზე დარეგისტრირებული მომხმარებლების სია — სულ {initialUsers.length}.
      </p>

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={pageItems}
          getRowKey={(user) => user.id}
          emptyMessage="მომხმარებელი არ არსებობს"
        />
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
