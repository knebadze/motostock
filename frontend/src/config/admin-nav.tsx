import type { ReactNode } from "react";
import { LOOKUP_TYPES } from "./lookup-types";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const dashboardIcon = (
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
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const categoriesIcon = (
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
    <path d="M3 7h6M3 12h6M3 17h6" />
    <path d="M13 7h8M13 12h8M13 17h8" />
  </svg>
);

const brandsIcon = (
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
    <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.58 3.2L4 3a1 1 0 0 0-1 1l.2 5.58a2 2 0 0 0 .59 1.4l9.58 9.6a2 2 0 0 0 2.83 0l4.4-4.4a2 2 0 0 0 0-2.77Z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const modelsIcon = (
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
    <path d="m12 2 9 4.9-9 4.9-9-4.9Z" />
    <path d="m3 12 9 4.9 9-4.9" />
    <path d="m3 17 9 4.9 9-4.9" />
  </svg>
);

const vehicleCatalogIcon = (
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
    <circle cx="6" cy="17" r="3" />
    <circle cx="18" cy="17" r="3" />
    <path d="M9 17h6M13 5l4 4-3 3-2-2H9l-2 5" />
  </svg>
);

const classifierIcon = (
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
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
  </svg>
);

export const adminNav: AdminNavSection[] = [
  {
    label: "მთავარი",
    items: [
      { label: "დეშბორდი", href: "/admin", icon: dashboardIcon },
      { label: "კატეგორიები", href: "/admin/categories", icon: categoriesIcon },
    ],
  },
  {
    label: "ტექნიკის კატალოგი",
    items: [
      { label: "მარკები", href: "/admin/brands", icon: brandsIcon },
      { label: "მოდელები", href: "/admin/models", icon: modelsIcon },
      { label: "ტექნიკა", href: "/admin/vehicle-catalog", icon: vehicleCatalogIcon },
    ],
  },
  {
    label: "კლასიფიკატორები",
    items: LOOKUP_TYPES.map((lookupType) => ({
      label: lookupType.label,
      href: `/admin/classifiers/${lookupType.slug}`,
      icon: classifierIcon,
    })),
  },
];
