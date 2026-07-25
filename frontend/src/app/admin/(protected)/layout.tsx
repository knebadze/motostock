import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromServer();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return <AdminShell userName={user.name}>{children}</AdminShell>;
}
