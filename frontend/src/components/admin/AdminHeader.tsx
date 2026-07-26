"use client";

import { UserMenu } from "./UserMenu";

export function AdminHeader({
  userName,
  sidebarOpen,
  onMenuClick,
}: {
  userName: string;
  sidebarOpen: boolean;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "მენიუს დახურვა" : "მენიუს გახსნა"}
          className="relative z-60 flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            {sidebarOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
        <span className="text-sm font-semibold md:hidden">MotoStock</span>
      </div>

      <UserMenu userName={userName} />
    </header>
  );
}
