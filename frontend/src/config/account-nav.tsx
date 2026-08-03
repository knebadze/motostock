import type { ReactNode } from "react";
import { dashboardIcon } from "./admin-nav-icons";

const garageIcon: ReactNode = (
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
    <path d="M3 21V10l9-6 9 6v11" />
    <path d="M3 10h18" />
    <rect x="7" y="13" width="4" height="8" />
    <path d="M15 13h3v4h-3z" />
  </svg>
);

const ordersIcon: ReactNode = (
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
    <path d="M6 2h9l3 3v17H6z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
);

const passwordIcon: ReactNode = (
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
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export type AccountNavItem = {
  labelKey: "dashboard" | "garage" | "orders" | "changePassword";
  href: string;
  icon: ReactNode;
};

// Href values are locale-agnostic segments — the Link/navigation helpers
// from "@/i18n/navigation" add the current locale prefix automatically.
export const accountNav: AccountNavItem[] = [
  { labelKey: "dashboard", href: "/account", icon: dashboardIcon },
  { labelKey: "garage", href: "/account/garage", icon: garageIcon },
  { labelKey: "orders", href: "/account/orders", icon: ordersIcon },
  { labelKey: "changePassword", href: "/account/change-password", icon: passwordIcon },
];
