"use client";

import { useState, useSyncExternalStore } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";
// Fired after a same-tab write so the useSyncExternalStore subscriber below
// re-reads immediately — the native "storage" event only fires in *other*
// tabs, never the one that made the change.
const COLLAPSE_CHANGE_EVENT = "admin-sidebar-collapsed-change";

function subscribeToCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getCollapsedSnapshot() {
  return localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true";
}

// Used for both the server render and the client's first (hydration) pass
// so they match exactly — localStorage doesn't exist on the server, and
// useSyncExternalStore automatically re-renders with the real client value
// right after hydration, same end result as the old mount-effect but
// without a synchronous setState in an effect body.
function getCollapsedServerSnapshot() {
  return false;
}

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeToCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  function toggleCollapsed() {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(COLLAPSE_CHANGE_EVENT));
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
