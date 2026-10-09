import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { AdminShell } from "@/components/admin/AdminShell";

// Per-page restriction for OPERATOR (a limited staff/cashier role — view-only
// across products/vehicle-listings/service-history/fina-sync, plus order
// status changes) is enforced in proxy.ts's middleware, not here — it has
// `request.nextUrl.pathname` directly, with no risk of the pathname going
// stale or unreadable the way a headers()-forwarded value could. This layout
// only needs to confirm someone's actually allowed into the admin panel at
// all.
export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromServer();

  if (!user || (user.role !== "ADMIN" && user.role !== "OPERATOR")) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName={user.name} role={user.role}>
      {children}
    </AdminShell>
  );
}
