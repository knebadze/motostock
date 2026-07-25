import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromServer();

  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <main className="flex-1">
      <AdminTopbar userName={user.name} />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
