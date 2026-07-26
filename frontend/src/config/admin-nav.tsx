import type { ReactNode } from "react";
import { LOOKUP_TYPES } from "./lookup-types";
import {
  brandsIcon,
  categoriesIcon,
  classifierIcon,
  dashboardIcon,
  listingIcon,
  modelsIcon,
  vehicleCatalogIcon,
} from "./admin-nav-icons";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

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
    label: "გაყიდვები",
    items: [
      { label: "გასაყიდი ტექნიკა", href: "/admin/vehicle-listings", icon: listingIcon },
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
