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

const wishlistIcon: ReactNode = (
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
    <path d="M12 21s-6.7-4.35-9.33-8.2C1.02 10.6 1.6 7.2 4.3 5.6c2.2-1.3 4.9-.8 6.3 1.1l1.4 1.9 1.4-1.9c1.4-1.9 4.1-2.4 6.3-1.1 2.7 1.6 3.28 5 1.63 7.2C18.7 16.65 12 21 12 21Z" />
  </svg>
);

const compareIcon: ReactNode = (
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
    <path d="M4 20h16M7 20V10m5 10V4m5 16v-7" />
  </svg>
);

const cartIcon: ReactNode = (
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
    <path d="M6 6h15l-1.5 9h-12z" />
    <path d="M6 6 5 3H2" />
    <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
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

const addressIcon: ReactNode = (
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
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
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
  labelKey:
    | "dashboard"
    | "garage"
    | "wishlist"
    | "compare"
    | "cart"
    | "orders"
    | "address"
    | "changePassword";
  href: string;
  icon: ReactNode;
};

// Href values are locale-agnostic segments — the Link/navigation helpers
// from "@/i18n/navigation" add the current locale prefix automatically.
export const accountNav: AccountNavItem[] = [
  { labelKey: "dashboard", href: "/account", icon: dashboardIcon },
  { labelKey: "garage", href: "/account/garage", icon: garageIcon },
  { labelKey: "wishlist", href: "/wishlist", icon: wishlistIcon },
  { labelKey: "compare", href: "/compare", icon: compareIcon },
  { labelKey: "cart", href: "/cart", icon: cartIcon },
  { labelKey: "orders", href: "/account/orders", icon: ordersIcon },
  { labelKey: "address", href: "/account/address", icon: addressIcon },
  { labelKey: "changePassword", href: "/account/change-password", icon: passwordIcon },
];
