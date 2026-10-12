"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { WishlistDropdown } from "@/components/shared/WishlistDropdown";
import { CompareDropdown } from "@/components/shared/CompareDropdown";
import { CartDropdown } from "@/components/shared/CartDropdown";
import { Logo } from "@/components/shared/Logo";
import { usePopoverMenu } from "@/components/shared/usePopoverMenu";
import { facebookIcon, instagramIcon, tiktokIcon, youtubeIcon } from "@/components/shared/social-icons";
import { logoutUser, type User } from "@/lib/api/auth";
import { resolveMediaUrl } from "@/lib/api/client";
import { setKnownAuthState } from "@/lib/api/auth-state";
import { setKnownGuestFeatureStatus } from "@/lib/api/guest-feature-state";
import { COMPARE_COUNT_CHANGED_EVENT, WISHLIST_COUNT_CHANGED_EVENT, setKnownCount } from "@/lib/badge-count-events";
import type { GuestFeatureStatus } from "@/lib/api/server";
import { formatShortName } from "@/lib/format";
import type { HeaderCategory } from "@/lib/api/categories";

import type { CompanyInfo } from "@/lib/api/company-info";

const MEGA_MENU_CLOSE_DELAY_MS = 150;

// Kept in brand color (independent of the surrounding link's muted/hover
// text color) so they read as small badges against the label text instead
// of blending into it.
const phoneIcon = (
  <span className="text-primary-text">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.3-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  </span>
);

const mailIcon = (
  <span className="text-primary-text">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 8.9 6.2a2 2 0 0 0 2.2 0L22 7" />
    </svg>
  </span>
);

type MegaMenuGroup = {
  heading: HeaderCategory | null;
  items: HeaderCategory[];
};

// A top-level category's mega-menu columns (RevZilla-style): its direct
// leaf children together in one list (headed by the category itself), then
// one column per child that has children of its own, listing those.
function buildMegaMenuGroups(root: HeaderCategory, childrenOf: (id: number) => HeaderCategory[]): MegaMenuGroup[] {
  const children = childrenOf(root.id);
  const leaves = children.filter((child) => childrenOf(child.id).length === 0);
  const groups = children
    .filter((child) => childrenOf(child.id).length > 0)
    .map((child) => ({ heading: child, items: childrenOf(child.id) }));
  return leaves.length > 0 ? [{ heading: null, items: leaves }, ...groups] : groups;
}

const chevronRightIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0 text-muted-foreground"
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export function Header({
  user = null,
  categories = [],
  companyInfo = null,
  wishlistCount = 0,
  compareCount = 0,
  cartCount = 0,
  guestFeatureStatus = { guestWishlistEnabled: false, guestCartEnabled: false },
}: {
  user?: User | null;
  /** Full category tree (all depths) — the header derives top-level nav items and their children itself. */
  categories?: HeaderCategory[];
  companyInfo?: CompanyInfo | null;
  wishlistCount?: number;
  compareCount?: number;
  cartCount?: number;
  guestFeatureStatus?: GuestFeatureStatus;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tHeader = useTranslations("Header");
  const tFooter = useTranslations("Footer");
  const [isOpen, setIsOpen] = useState(false);
  const {
    open: accountMenuOpen,
    setOpen: setAccountMenuOpen,
    containerRef: accountMenuRef,
    triggerRef: accountMenuTriggerRef,
  } = usePopoverMenu({ arrowNav: true });
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mobile menu drill-down: the stack of category ids the visitor has
  // tapped into (empty = the main menu). Reset whenever the menu is opened.
  const [mobileCategoryPath, setMobileCategoryPath] = useState<number[]>([]);
  // Which way the last drill-down step went — picks the slide direction of
  // the panel that just mounted ("none" right after opening the menu).
  const [mobileSlideDirection, setMobileSlideDirection] = useState<"forward" | "back" | "none">("none");
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

  // Records this page's own SSR-resolved auth state for client.ts's 401
  // interceptor (see auth-state.ts) — every guest page mounts this exactly
  // once per navigation/refresh with a fresh `user` prop. Same treatment for
  // guestFeatureStatus (see guest-feature-state.ts), so WishlistButton/
  // AddToCartButton elsewhere on the page can skip their status check
  // instead of always firing it and relying on a 401. And the badge counts
  // (see badge-count-events.ts), so grids skip their wishlist/compare status
  // check when that collection is empty.
  useEffect(() => {
    setKnownAuthState(user != null);
    setKnownGuestFeatureStatus(guestFeatureStatus);
    setKnownCount(WISHLIST_COUNT_CHANGED_EVENT, wishlistCount);
    setKnownCount(COMPARE_COUNT_CHANGED_EVENT, compareCount);
  }, [user, guestFeatureStatus, wishlistCount, compareCount]);

  const childrenByParent = new Map<number | null, HeaderCategory[]>();
  for (const category of categories) {
    const siblings = childrenByParent.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parentId, siblings);
  }
  const childrenOf = (id: number | null) => childrenByParent.get(id) ?? [];
  const topLevelCategories = childrenOf(null);
  const socialLinks = [
    { href: companyInfo?.facebookUrl, icon: facebookIcon, label: "Facebook" },
    {
      href: companyInfo?.instagramUrl,
      icon: instagramIcon,
      label: "Instagram",
    },
    { href: companyInfo?.youtubeUrl, icon: youtubeIcon, label: "YouTube" },
    { href: companyInfo?.tiktokUrl, icon: tiktokIcon, label: "TikTok" },
  ].filter((social): social is { href: string; icon: typeof facebookIcon; label: string } => Boolean(social.href));
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? null;
  const megaMenuGroups = activeCategory ? buildMegaMenuGroups(activeCategory, childrenOf) : [];
  const mobileCategory =
    mobileCategoryPath.length > 0
      ? (categories.find((category) => category.id === mobileCategoryPath[mobileCategoryPath.length - 1]) ?? null)
      : null;
  const mobileParentCategory =
    mobileCategoryPath.length > 1
      ? (categories.find((category) => category.id === mobileCategoryPath[mobileCategoryPath.length - 2]) ?? null)
      : null;

  function drillIntoMobileCategory(categoryId: number) {
    setMobileCategoryPath((path) => [...path, categoryId]);
    setMobileSlideDirection("forward");
    mobileScrollRef.current?.scrollTo({ top: 0 });
  }

  function drillOutOfMobileCategory() {
    setMobileCategoryPath((path) => path.slice(0, -1));
    setMobileSlideDirection("back");
    mobileScrollRef.current?.scrollTo({ top: 0 });
  }

  function cancelMegaMenuClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function openMegaMenu(categoryId: number) {
    cancelMegaMenuClose();
    setActiveCategoryId(categoryId);
  }

  function scheduleMegaMenuClose() {
    cancelMegaMenuClose();
    closeTimeoutRef.current = setTimeout(() => setActiveCategoryId(null), MEGA_MENU_CLOSE_DELAY_MS);
  }

  useEffect(() => cancelMegaMenuClose, []);

  useEffect(() => {
    if (activeCategoryId === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveCategoryId(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCategoryId]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleLogout() {
    setAccountMenuOpen(false);
    setIsOpen(false);
    try {
      await logoutUser();
      router.push("/");
      router.refresh();
    } catch {
      toast.error(tHeader("logoutError"));
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="hidden border-b border-border bg-muted/40 lg:block">
        <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-6 text-xs text-muted-foreground lg:px-8">
          <div className="flex items-center gap-4">
            {companyInfo?.phone && (
              <a
                href={`tel:${companyInfo.phone}`}
                className="flex items-center gap-1.5 transition-colors hover:text-primary-text"
              >
                {phoneIcon}
                {companyInfo.phone}
              </a>
            )}
            {companyInfo?.email && (
              <a
                href={`mailto:${companyInfo.email}`}
                className="flex items-center gap-1.5 transition-colors hover:text-primary-text"
              >
                {mailIcon}
                {companyInfo.email}
              </a>
            )}
            {socialLinks.length > 0 && (
              <>
                <span className="h-3.5 w-px bg-border" aria-hidden />
                <div className="flex items-center gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="text-primary-text transition-opacity hover:opacity-70 [&>svg]:size-4"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-4">
              <Link href="/service" className="transition-colors hover:text-primary-text">
                {tFooter("serviceTitle")}
              </Link>
              <Link href="/about" className="transition-colors hover:text-primary-text">
                {tFooter("aboutUs")}
              </Link>
              <Link href="/contact" className="transition-colors hover:text-primary-text">
                {tFooter("contactTitle")}
              </Link>
              <Link href="/vacancies" className="transition-colors hover:text-primary-text">
                {tFooter("vacanciesTitle")}
              </Link>
              <Link href="/terms" className="transition-colors hover:text-primary-text">
                {tFooter("termsTitle")}
              </Link>
              {/* <Link href="/privacy" className="transition-colors hover:text-primary-text">
                {tFooter("privacyTitle")}
              </Link> */}
            </nav>
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <LanguageSwitcher compact />
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <ThemeToggle compact />
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center">
          <Logo className="h-8 w-auto sm:h-9" padding="px-3 py-1 sm:px-4" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <WishlistDropdown initialCount={wishlistCount} />
          <CompareDropdown initialCount={compareCount} />
          <CartDropdown initialCount={cartCount} />

          {user ? (
            <div ref={accountMenuRef} className="relative hidden lg:block">
              <button
                ref={accountMenuTriggerRef}
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span>{formatShortName(user.name)}</span>
              </button>

              {accountMenuOpen && (
                <ul
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
                >
                  <li>
                    {user.role === "ADMIN" || user.role === "OPERATOR" ? (
                      // /admin isn't locale-routed (see proxy.ts's own comment on this) —
                      // a logged-in admin's (or operator's — same reasoning, a
                      // limited staff role, not a customer) "account" is the
                      // admin panel, not the customer-facing /account area
                      // (which also hard-gates on emailVerified, a check that
                      // never applies to how these accounts are provisioned).
                      // Plain next/link, not the i18n-aware `Link` above, since
                      // that one only knows how to prefix locale-routed paths.
                      <NextLink
                        href="/admin"
                        onClick={() => setAccountMenuOpen(false)}
                        role="menuitem"
                        className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                      >
                        {tHeader("adminPanel")}
                      </NextLink>
                    ) : (
                      <Link
                        href="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        role="menuitem"
                        className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                      >
                        {tHeader("myAccount")}
                      </Link>
                    )}
                  </li>
                  <li className="border-t border-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                    >
                      {tHeader("logout")}
                    </button>
                  </li>
                </ul>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/register"
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
              >
                {tHeader("register")}
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {tHeader("login")}
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen((open) => !open);
              setMobileCategoryPath([]);
              setMobileSlideDirection("none");
            }}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? tHeader("closeMenu") : tHeader("openMenu")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary-text sm:size-10 lg:hidden"
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
              {isOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Category bar (desktop) — its own full-width row under the logo row
          (RevZilla-style), opening a full-width mega menu on hover/focus. */}
      <nav onMouseLeave={scheduleMegaMenuClose} className="hidden border-t border-border lg:block">
        <div className="mx-auto flex max-w-7xl items-stretch gap-1 px-6 lg:px-8">
          {topLevelCategories.map((category) => {
            const href = `/${category.slug}`;
            const hasChildren = childrenOf(category.id).length > 0;
            const isOpenNow = activeCategoryId === category.id;
            const isActive = pathname === href;
            return (
              <div
                key={category.id}
                onMouseEnter={() => (hasChildren ? openMegaMenu(category.id) : scheduleMegaMenuClose())}
              >
                <Link
                  href={href}
                  onClick={() => setActiveCategoryId(null)}
                  onFocus={() => hasChildren && openMegaMenu(category.id)}
                  aria-expanded={hasChildren ? isOpenNow : undefined}
                  className={`flex h-11 items-center gap-1 border-b-2 px-3 text-sm font-semibold transition-colors ${
                    isOpenNow || isActive
                      ? "border-primary text-primary-text"
                      : "border-transparent text-foreground hover:text-primary-text"
                  }`}
                >
                  {category.name}
                  {hasChildren && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`size-3.5 transition-transform ${isOpenNow ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      {activeCategory && megaMenuGroups.length > 0 && (
        <div
          onMouseEnter={cancelMegaMenuClose}
          onMouseLeave={scheduleMegaMenuClose}
          className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-9.5rem)] overflow-y-auto border-b border-border bg-background shadow-xl lg:block"
        >
          <div className="mx-auto flex max-w-7xl gap-10 px-6 py-8 lg:px-8">
            <div className="min-w-0 flex-1">
              <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-3">
                <p className="text-lg font-bold tracking-tight text-foreground">{activeCategory.name}</p>
                <Link
                  href={`/${activeCategory.slug}`}
                  onClick={() => setActiveCategoryId(null)}
                  className="text-sm font-semibold text-primary-text hover:underline"
                >
                  {tHeader("viewAll")} →
                </Link>
              </div>

              {/* Groups flow top-to-bottom through up to 4 columns; a
                  category with a single list (only leaf children) spreads
                  that list over 3 columns instead. */}
              <div
                className="gap-x-10"
                style={{
                  columnCount: megaMenuGroups.length === 1 ? 1 : Math.min(megaMenuGroups.length, 4),
                }}
              >
                {megaMenuGroups.map((group) => {
                  const heading = group.heading ?? activeCategory;
                  return (
                    <div key={heading.id} className="mb-7 break-inside-avoid">
                      <Link
                        href={`/${heading.slug}`}
                        onClick={() => setActiveCategoryId(null)}
                        className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:text-primary-text"
                      >
                        {heading.name}
                      </Link>
                      <ul
                        className={`flex flex-col gap-1.5 ${megaMenuGroups.length === 1 ? "columns-3 gap-x-10 [&>li]:mb-1.5 [&>li]:break-inside-avoid" : ""}`}
                        style={megaMenuGroups.length === 1 ? { display: "block" } : undefined}
                      >
                        {group.items.map((item) => {
                          const grandchildren = childrenOf(item.id);
                          return (
                            <li key={item.id}>
                              <Link
                                href={`/${item.slug}`}
                                onClick={() => setActiveCategoryId(null)}
                                className="text-sm text-muted-foreground transition-colors hover:text-primary-text"
                              >
                                {item.name}
                              </Link>
                              {grandchildren.length > 0 && (
                                <ul className="mt-1.5 flex flex-col gap-1 border-l border-border pl-3">
                                  {grandchildren.map((grandchild) => (
                                    <li key={grandchild.id}>
                                      <Link
                                        href={`/${grandchild.slug}`}
                                        onClick={() => setActiveCategoryId(null)}
                                        className="text-[13px] text-muted-foreground transition-colors hover:text-primary-text"
                                      >
                                        {grandchild.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Promo tile — the category's own image with a "view all" CTA. */}
            <Link
              href={`/${activeCategory.slug}`}
              onClick={() => setActiveCategoryId(null)}
              className="group relative hidden min-h-64 w-64 shrink-0 self-start overflow-hidden rounded-2xl bg-muted xl:block"
            >
              {resolveMediaUrl(activeCategory.imageUrl) && (
                <Image
                  src={resolveMediaUrl(activeCategory.imageUrl)!}
                  alt={activeCategory.name}
                  fill
                  sizes="256px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-lg font-bold text-white">{activeCategory.name}</p>
                <span className="mt-3 inline-flex rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                  {tHeader("viewAll")}
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Overlays the page below the h-16 bar (the only header row below
          lg) instead of pushing it down: absolute to the sticky header (a
          `fixed` child wouldn't work — the header's backdrop-blur makes it
          the containing block anyway), filling the rest of the screen and
          scrolling on its own; body scroll is locked while it's open (see
          the overflow effect above). `inert` while closed so its links
          aren't Tab-focusable or read by screen readers. */}
      <div
        id="mobile-nav"
        inert={!isOpen}
        className={`absolute inset-x-0 top-full h-[calc(100dvh-4rem)] bg-background transition-[opacity,transform] duration-200 ease-out lg:hidden ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div ref={mobileScrollRef} className="h-full overflow-x-hidden overflow-y-auto overscroll-contain">
          {/* Keyed by the drill-down path so every level change remounts it
              and replays the slide-in. */}
          <div
            key={mobileCategoryPath.join("/") || "main"}
            className={
              mobileSlideDirection === "forward"
                ? "motion-safe:animate-slide-in-right"
                : mobileSlideDirection === "back"
                  ? "motion-safe:animate-slide-in-left"
                  : undefined
            }
          >
            {mobileCategory ? (
              // Drilled into a category (RevZilla-style): back link, "view
              // all", then its children — tapping one with children of its own
              // goes a level deeper.
              <div>
                <div className="sticky top-0 z-10 border-b border-border bg-background px-2 py-1.5 sm:px-4">
                  <button
                    type="button"
                    onClick={drillOutOfMobileCategory}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary-text"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                      aria-hidden
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    {mobileParentCategory ? mobileParentCategory.name : tHeader("mainMenu")}
                  </button>
                </div>
                <nav className="flex flex-col px-4 py-3 text-sm font-medium sm:px-6">
                  <p className="px-3 pb-2 pt-1 text-lg font-bold tracking-tight text-foreground">
                    {mobileCategory.name}
                  </p>
                  <Link
                    href={`/${mobileCategory.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-3 font-semibold text-primary-text transition-colors hover:bg-muted"
                  >
                    {tHeader("viewAll")}
                    {chevronRightIcon}
                  </Link>
                  <div className="my-1 border-t border-border" />
                  {childrenOf(mobileCategory.id).map((child) =>
                    childrenOf(child.id).length > 0 ? (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => drillIntoMobileCategory(child.id)}
                        className="flex items-center justify-between rounded-lg px-3 py-3 text-left text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                      >
                        {child.name}
                        {chevronRightIcon}
                      </button>
                    ) : (
                      <Link
                        key={child.id}
                        href={`/${child.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg px-3 py-3 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                      >
                        {child.name}
                      </Link>
                    ),
                  )}
                </nav>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {companyInfo?.phone && (
                      <a href={`tel:${companyInfo.phone}`} className="flex items-center gap-1.5">
                        {phoneIcon}
                        {companyInfo.phone}
                      </a>
                    )}
                    {companyInfo?.email && (
                      <a href={`mailto:${companyInfo.email}`} className="flex items-center gap-1.5">
                        {mailIcon}
                        {companyInfo.email}
                      </a>
                    )}
                    {socialLinks.length > 0 && (
                      <div className="mt-1 flex items-center gap-3">
                        {socialLinks.map((social) => (
                          <a
                            key={social.label}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={social.label}
                            className="text-primary-text transition-opacity hover:opacity-70 [&>svg]:size-4"
                          >
                            {social.icon}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                </div>

                <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium sm:px-6">
                  {/* Top-level categories — one with subcategories drills into its
                own panel (see mobileCategory above) instead of expanding
                in place. */}
                  {topLevelCategories.map((category) => {
                    const href = `/${category.slug}`;
                    const isActive = pathname === href;
                    return childrenOf(category.id).length > 0 ? (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => drillIntoMobileCategory(category.id)}
                        className={`flex items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted hover:text-primary-text ${
                          isActive ? "text-primary-text" : "text-foreground"
                        }`}
                      >
                        {category.name}
                        {chevronRightIcon}
                      </button>
                    ) : (
                      <Link
                        key={category.id}
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className={`rounded-lg px-3 py-3 transition-colors hover:bg-muted hover:text-primary-text ${
                          isActive ? "text-primary-text" : "text-foreground"
                        }`}
                      >
                        {category.name}
                      </Link>
                    );
                  })}

                  <div className="my-2 border-t border-border" />

                  <Link
                    href="/service"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tFooter("serviceTitle")}
                  </Link>

                  <Link
                    href="/about"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tFooter("aboutUs")}
                  </Link>

                  <Link
                    href="/contact"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tFooter("contactTitle")}
                  </Link>

                  <Link
                    href="/vacancies"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tFooter("vacanciesTitle")}
                  </Link>

                  <Link
                    href="/terms"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tFooter("termsTitle")}
                  </Link>

                  {/* <Link
              href="/privacy"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
            >
              {tFooter("privacyTitle")}
            </Link> */}

                  <div className="my-2 border-t border-border" />

                  <Link
                    href="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tHeader("wishlist")}
                    {wishlistCount > 0 && <span className="text-muted-foreground"> ({wishlistCount})</span>}
                  </Link>

                  <Link
                    href="/compare"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tHeader("compare")}
                    {compareCount > 0 && <span className="text-muted-foreground"> ({compareCount})</span>}
                  </Link>

                  <Link
                    href="/cart"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                  >
                    {tHeader("cart")}
                    {cartCount > 0 && <span className="text-muted-foreground"> ({cartCount})</span>}
                  </Link>

                  {user ? (
                    <>
                      {user.role === "ADMIN" || user.role === "OPERATOR" ? (
                        <NextLink
                          href="/admin"
                          onClick={() => setIsOpen(false)}
                          className="mt-2 rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                        >
                          {tHeader("adminPanel")}
                        </NextLink>
                      ) : (
                        <Link
                          href="/account"
                          onClick={() => setIsOpen(false)}
                          className="mt-2 rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                        >
                          {tHeader("myAccount")}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-full bg-primary px-4 py-2.5 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        {tHeader("logout")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/register"
                        onClick={() => setIsOpen(false)}
                        className="mt-2 rounded-lg border border-border px-3 py-2.5 text-center font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary-text"
                      >
                        {tHeader("register")}
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="rounded-full bg-primary px-4 py-2.5 text-center font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        {tHeader("login")}
                      </Link>
                    </>
                  )}
                </nav>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
