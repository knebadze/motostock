"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/api/auth";

export type AdminRole = Extract<User["role"], "ADMIN" | "OPERATOR">;

// Only ADMIN/OPERATOR ever reach this provider — the (protected) layout
// redirects anyone else to /admin/login before AdminShell ever renders (see
// its own gate). Client components under the admin shell (list managers,
// the sidebar, ...) read this instead of re-fetching the current user just
// to know whether to show a write action.
const AdminRoleContext = createContext<AdminRole | null>(null);

export function AdminRoleProvider({
  role,
  children,
}: {
  role: AdminRole;
  children: React.ReactNode;
}) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

// Throws if used outside AdminShell — every consumer lives under the admin
// panel, so a missing provider means a real wiring bug, not a legitimate
// "no role yet" state to handle gracefully.
export function useAdminRole(): AdminRole {
  const role = useContext(AdminRoleContext);
  if (!role) {
    throw new Error("useAdminRole must be used within AdminShell");
  }
  return role;
}
