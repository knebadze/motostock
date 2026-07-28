"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/config/admin-nav";
import { Logo } from "@/components/shared/Logo";

export function AdminSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card shadow-lg transition-[transform,width] duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-64 md:w-20" : "w-64"}`}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "მენიუს გაშლა" : "მენიუს აკეცვა"}
          className="absolute -right-3.5 top-8 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:border-primary/50 hover:text-primary md:flex"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div
          className={`flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4 ${
            collapsed ? "md:justify-center" : ""
          }`}
        >
          <Logo className={`h-10 w-auto ${collapsed ? "md:hidden" : ""}`} />
        </div>

        <nav
          className={`flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3 ${
            collapsed ? "md:items-center md:px-2" : ""
          }`}
        >
          {adminNav.map((section) => (
            <div key={section.label} className="flex w-full flex-col gap-0.5">
              <span
                className={`px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                  collapsed ? "md:hidden" : ""
                }`}
              >
                {section.label}
              </span>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-muted hover:text-primary"
                    } ${collapsed ? "md:justify-center md:px-2" : ""}`}
                  >
                    {item.icon}
                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
