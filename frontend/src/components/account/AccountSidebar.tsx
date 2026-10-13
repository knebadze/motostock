"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { accountNav } from "@/config/account-nav";
import type { User } from "@/lib/api/auth";

export function AccountSidebar({ user }: { user: User }) {
  const t = useTranslations("Account");
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // Phones show the nav as a horizontal strip — keep the current page's tab
  // in view instead of possibly scrolled off to the right.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <aside className="h-fit min-w-0 rounded-2xl border border-border bg-card p-2 shadow-sm md:sticky md:top-24 md:p-4 lg:top-40">
      <div className="hidden items-center gap-3 border-b border-border pb-4 md:flex">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:mt-4 md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {accountNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={isActive ? activeRef : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors md:gap-3 md:whitespace-normal md:py-2.5 ${
                isActive
                  ? "bg-primary/10 font-semibold text-primary-text"
                  : "text-foreground hover:bg-muted hover:text-primary-text"
              }`}
            >
              {/* shrink-0: a long label (e.g. "პროფილი და მონაცემები") used to
                  squeeze the icon down to nothing in the narrow sidebar. */}
              <span className="flex shrink-0">{item.icon}</span>
              {t(`nav.${item.labelKey}`)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
