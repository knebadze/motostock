"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { accountNav } from "@/config/account-nav";
import type { User } from "@/lib/api/auth";

export function AccountSidebar({ user }: { user: User }) {
  const t = useTranslations("Account");
  const pathname = usePathname();

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-4 shadow-sm md:sticky md:top-24">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <nav className="mt-4 flex flex-col gap-1">
        {accountNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-foreground hover:bg-muted hover:text-primary"
              }`}
            >
              {item.icon}
              {t(`nav.${item.labelKey}`)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
