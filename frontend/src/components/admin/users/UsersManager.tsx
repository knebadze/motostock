"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination, usePagination } from "@/components/shared/Pagination";
import type { AdminUser } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";
import { UserDetailModal } from "./UserDetailModal";

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
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

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
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {viewingUserId != null && (
        <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}
