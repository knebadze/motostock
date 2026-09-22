import type { ReactNode } from "react";
import {
  analyticsIcon,
  attributesIcon,
  banksIcon,
  brandsIcon,
  buyTogetherIcon,
  categoriesIcon,
  classifierIcon,
  companyInfoIcon,
  compatibilityIcon,
  dashboardIcon,
  discountRulesIcon,
  emailTemplatesIcon,
  errorLogIcon,
  faqIcon,
  filtersIcon,
  finaSyncIcon,
  fraudIcon,
  heroSlidesIcon,
  listingIcon,
  modelsIcon,
  newsletterIcon,
  ordersIcon,
  productsIcon,
  promoCodesIcon,
  scheduledJobsIcon,
  serviceHistoryIcon,
  serviceTypesIcon,
  sessionsIcon,
  settingsIcon,
  statusesIcon,
  teamIcon,
  privacyPolicyIcon,
  termsIcon,
  usersIcon,
  vacanciesIcon,
  vehicleCatalogIcon,
  visitorsIcon,
} from "./admin-nav-icons";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  // Extra roles (beyond ADMIN, which always sees everything) allowed to see
  // this item — omitted means ADMIN-only. See AdminSidebar.tsx's filtering
  // and the (protected) layout's matching page-level allow-list, which must
  // be kept in sync with whatever's marked visible here.
  allowedRoles?: "OPERATOR"[];
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const adminNav: AdminNavSection[] = [
  {
    label: "მთავარი",
    items: [
      { label: "დეშბორდი", href: "/admin", icon: dashboardIcon, allowedRoles: ["OPERATOR"] },
      { label: "ვიზიტორები", href: "/admin/visitors", icon: visitorsIcon },
      {
        label: "ანალიტიკა",
        href: "/admin/analytics",
        icon: analyticsIcon,
        allowedRoles: ["OPERATOR"],
      },
      { label: "შეკვეთები", href: "/admin/orders", icon: ordersIcon, allowedRoles: ["OPERATOR"] },
      { label: "მომხმარებლები", href: "/admin/users", icon: usersIcon, allowedRoles: ["OPERATOR"] },
      { label: "კატეგორიები", href: "/admin/categories", icon: categoriesIcon },
      {
        label: "FINA სინქრონიზაცია",
        href: "/admin/fina-sync",
        icon: finaSyncIcon,
        allowedRoles: ["OPERATOR"],
      },
      { label: "ავტომატური დავალებები", href: "/admin/scheduled-jobs", icon: scheduledJobsIcon },
    ],
  },
  {
    label: "ტექნიკა",
    items: [
      { label: "მარკები", href: "/admin/brands", icon: brandsIcon },
      { label: "მოდელები", href: "/admin/models", icon: modelsIcon },
      { label: "ტექნიკის კატალოგი", href: "/admin/vehicle-catalog", icon: vehicleCatalogIcon },
      {
        label: "გასაყიდი ტექნიკა",
        href: "/admin/vehicle-listings",
        icon: listingIcon,
        allowedRoles: ["OPERATOR"],
      },
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
      { label: "პროდუქტები", href: "/admin/products", icon: productsIcon, allowedRoles: ["OPERATOR"] },
      { label: "ბრენდები", href: "/admin/product-brands", icon: brandsIcon },
      { label: "მახასიათებლები", href: "/admin/attributes", icon: attributesIcon },
      { label: "კატეგორიის ფილტრები", href: "/admin/category-filters", icon: filtersIcon },
      {
        label: "თავსებადობა",
        href: "/admin/compatibility",
        icon: compatibilityIcon,
        allowedRoles: ["OPERATOR"],
      },
      {
        label: "ერთად შეძენა",
        href: "/admin/buy-together",
        icon: buyTogetherIcon,
        allowedRoles: ["OPERATOR"],
      },
    ],
  },
  {
    label: "კლასიფიკატორები",
    items: [
      { label: "საერთო კლასიფიკატორები", href: "/admin/general-classifiers", icon: classifierIcon },
      { label: "ტრანსპორტის კლასიფიკატორები", href: "/admin/classifiers", icon: classifierIcon },
      { label: "სტატუსები", href: "/admin/statuses", icon: statusesIcon },
    ],
  },
  {
    label: "მარკეტინგი",
    items: [
      { label: "მთავარი გვერდის სერვისი", href: "/admin/hero-slides", icon: heroSlidesIcon },
      {
        label: "მასობრივი ფასდაკლებები",
        href: "/admin/bulk-discounts",
        icon: discountRulesIcon,
        allowedRoles: ["OPERATOR"],
      },
      {
        label: "პრომოკოდები",
        href: "/admin/promo-codes",
        icon: promoCodesIcon,
        allowedRoles: ["OPERATOR"],
      },
      { label: "Newsletter", href: "/admin/newsletter", icon: newsletterIcon },
    ],
  },
  {
    label: "გადახდები",
    items: [{ label: "ბანკები", href: "/admin/banks", icon: banksIcon }],
  },
  {
    label: "სახელოსნო",
    items: [
      { label: "სერვისების ტიპები", href: "/admin/service-types", icon: serviceTypesIcon },
      {
        label: "სერვისის ისტორია",
        href: "/admin/service-history",
        icon: serviceHistoryIcon,
        allowedRoles: ["OPERATOR"],
      },
    ],
  },
  {
    label: "უსაფრთხოება",
    items: [
      { label: "თაღლითობის მონიტორინგი", href: "/admin/fraud", icon: fraudIcon },
      { label: "აქტიური სესიები", href: "/admin/sessions", icon: sessionsIcon },
      { label: "შეცდომების ჟურნალი", href: "/admin/error-logs", icon: errorLogIcon },
    ],
  },
  // One-time setup content — filled in once and rarely touched again, so
  // it belongs at the bottom, out of the way of daily-use sections above.
  {
    label: "საიტის მართვა",
    items: [
      { label: "კომპანიის ინფორმაცია", href: "/admin/company-info", icon: companyInfoIcon },
      { label: "გუნდი", href: "/admin/team-members", icon: teamIcon },
      { label: "წესები და პირობები", href: "/admin/terms", icon: termsIcon },
      { label: "კონფიდენციალობის პოლიტიკა", href: "/admin/privacy-policy", icon: privacyPolicyIcon },
      { label: "ხშირად დასმული კითხვები", href: "/admin/faq", icon: faqIcon },
      { label: "ვაკანსიები", href: "/admin/vacancies", icon: vacanciesIcon },
      { label: "იმეილის შაბლონები", href: "/admin/email-templates", icon: emailTemplatesIcon },
      { label: "პარამეტრები", href: "/admin/settings", icon: settingsIcon },
    ],
  },
];
