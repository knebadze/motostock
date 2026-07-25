"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutUser } from "@/lib/api/auth";

export function AdminTopbar({ userName }: { userName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutUser();
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("გამოსვლა ვერ მოხერხდა, სცადეთ ხელახლა");
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-sm font-medium text-muted-foreground">
          გამარჯობა, {userName}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="text-sm font-semibold text-foreground transition-colors hover:text-primary disabled:opacity-50"
        >
          გამოსვლა
        </button>
      </div>
    </div>
  );
}
