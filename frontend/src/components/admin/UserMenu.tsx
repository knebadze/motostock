"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logoutUser } from "@/lib/api/auth";
import { clearCache } from "@/lib/api/cache";
import { triggerFinaSync } from "@/lib/api/fina-sync";
import { ApiRequestError } from "@/lib/api/client";
import { formatShortName } from "@/lib/format";

export function UserMenu({ userName }: { userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logoutUser();
      router.push("/admin/login");
      router.refresh();
    } catch {
      toast.error("გამოსვლა ვერ მოხერხდა, სცადეთ ხელახლა");
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await triggerFinaSync();
      toast.success("სინქრონიზაცია დასრულდა");
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "სინქრონიზაცია ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleClearCache() {
    setClearingCache(true);
    try {
      await clearCache();
      toast.success("ქეში გასუფთავდა");
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "ქეშის გასუფთავება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setClearingCache(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {userName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{formatShortName(userName)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 text-muted-foreground"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <li>
            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              პარამეტრები
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-50"
            >
              {syncing ? "სინქრონიზაცია..." : "FINA სინქრონიზაცია ახლავე"}
            </button>
          </li>
          <li>
            <Link
              href="/admin/change-password"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              პაროლის შეცვლა
            </Link>
          </li>
          <li className="border-t border-border">
            <button
              type="button"
              onClick={handleClearCache}
              disabled={clearingCache}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary disabled:opacity-50"
            >
              {clearingCache ? "იწმინდება..." : "ქეშის გასუფთავება"}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              გასვლა
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
