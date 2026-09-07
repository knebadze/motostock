import { AdminChangePasswordForm } from "@/components/admin/change-password/AdminChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">პაროლის შეცვლა</h1>
      <p className="mt-2 text-muted-foreground">შეცვალეთ თქვენი ადმინისტრატორის ანგარიშის პაროლი.</p>
      <AdminChangePasswordForm />
    </div>
  );
}
