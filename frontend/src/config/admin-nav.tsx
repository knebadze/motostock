import type { ReactNode } from "react";
import {
  attributesIcon,
  brandsIcon,
  buyTogetherIcon,
  categoriesIcon,
  classifierIcon,
  compatibilityIcon,
  dashboardIcon,
  discountRulesIcon,
  filtersIcon,
  heroSlidesIcon,
  listingIcon,
  modelsIcon,
  ordersIcon,
  productsIcon,
  promoCodesIcon,
  usersIcon,
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
      { label: "მომხმარებლები", href: "/admin/users", icon: usersIcon },
      { label: "შეკვეთები", href: "/admin/orders", icon: ordersIcon },
      { label: "კატეგორიები", href: "/admin/categories", icon: categoriesIcon },
      { label: "მთავარი გვერდის სლაიდერი", href: "/admin/hero-slides", icon: heroSlidesIcon },
      { label: "მასობრივი ფასდაკლებები", href: "/admin/bulk-discounts", icon: discountRulesIcon },
      { label: "პრომოკოდები", href: "/admin/promo-codes", icon: promoCodesIcon },
    ],
  },
  {
    label: "ტექნიკა",
    items: [
      { label: "მარკები", href: "/admin/brands", icon: brandsIcon },
      { label: "მოდელები", href: "/admin/models", icon: modelsIcon },
      { label: "ტექნიკის კატალოგი", href: "/admin/vehicle-catalog", icon: vehicleCatalogIcon },
      { label: "გასაყიდი ტექნიკა", href: "/admin/vehicle-listings", icon: listingIcon },
      {
        label: "ტრანსპორტის ფილტრები",
        href: "/admin/vehicle-category-filters",
        icon: filtersIcon,
      },
    ],
  },
  {
    label: "პროდუქტები",
    items: [
      { label: "პროდუქტები", href: "/admin/products", icon: productsIcon },
      { label: "ბრენდები", href: "/admin/product-brands", icon: brandsIcon },
      { label: "მახასიათებლები", href: "/admin/attributes", icon: attributesIcon },
      { label: "კატეგორიის ფილტრები", href: "/admin/category-filters", icon: filtersIcon },
      { label: "თავსებადობა", href: "/admin/compatibility", icon: compatibilityIcon },
      { label: "ერთად შეძენა", href: "/admin/buy-together", icon: buyTogetherIcon },
    ],
  },
  {
    label: "კლასიფიკატორები",
    items: [
      { label: "საერთო კლასიფიკატორები", href: "/admin/general-classifiers", icon: classifierIcon },
      { label: "ტრანსპორტის კლასიფიკატორები", href: "/admin/classifiers", icon: classifierIcon },
    ],
  },
];
