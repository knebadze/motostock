"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex flex-1">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div
        className={`flex flex-1 flex-col transition-[padding-left] duration-200 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <AdminHeader
          userName={userName}
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        />
        <main className="flex-1 bg-muted/20 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
