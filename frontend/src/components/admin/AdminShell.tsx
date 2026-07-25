"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-1">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col md:pl-64">
        <AdminHeader
          userName={userName}
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
