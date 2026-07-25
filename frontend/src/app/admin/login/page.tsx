import { redirect } from "next/navigation";
import { getCurrentUserFromServer } from "@/lib/api/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage() {
  const user = await getCurrentUserFromServer();

  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <AdminLoginForm />
    </main>
  );
}
