"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { WishlistDropdown } from "@/components/shared/WishlistDropdown";
import { CompareDropdown } from "@/components/shared/CompareDropdown";
import { CartDropdown } from "@/components/shared/CartDropdown";
import { Logo } from "@/components/shared/Logo";
import { facebookIcon, instagramIcon, tiktokIcon, youtubeIcon } from "@/components/shared/social-icons";
import { logoutUser, type User } from "@/lib/api/auth";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatShortName } from "@/lib/format";
import type { Category } from "@/lib/api/categories";
import type { CompanyInfo } from "@/lib/api/company-info";

const MEGA_MENU_CLOSE_DELAY_MS = 150;

// Kept in brand color (independent of the surrounding link's muted/hover
// text color) so they read as small badges against the label text instead
// of blending into it.
const phoneIcon = (
  <span className="text-primary">
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
  <span className="text-primary">
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

export function Header({
  user = null,
  categories = [],
  companyInfo = null,
  wishlistCount = 0,
  compareCount = 0,
  cartCount = 0,
}: {
  user?: User | null;
  /** Full category tree (all depths) — the header derives top-level nav items and their children itself. */
  categories?: Category[];
  companyInfo?: CompanyInfo | null;
  wishlistCount?: number;
  compareCount?: number;
  cartCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as "ka" | "en" | "ru";
  const tHeader = useTranslations("Header");
  const tFooter = useTranslations("Footer");
  const [isOpen, setIsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topLevelCategories = categories.filter((category) => category.parentId === null);
  const socialLinks = [
    { href: companyInfo?.facebookUrl, icon: facebookIcon, label: "Facebook" },
    { href: companyInfo?.instagramUrl, icon: instagramIcon, label: "Instagram" },
    { href: companyInfo?.youtubeUrl, icon: youtubeIcon, label: "YouTube" },
    { href: companyInfo?.tiktokUrl, icon: tiktokIcon, label: "TikTok" },
  ].filter((social): social is { href: string; icon: typeof facebookIcon; label: string } =>
    Boolean(social.href),
  );
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? null;
  const activeChildren = activeCategory
    ? categories.filter((category) => category.parentId === activeCategory.id)
    : [];

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

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

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
                className="flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                {phoneIcon}
                {companyInfo.phone}
              </a>
            )}
            {companyInfo?.email && (
              <a
                href={`mailto:${companyInfo.email}`}
                className="flex items-center gap-1.5 transition-colors hover:text-primary"
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
                      className="text-primary transition-opacity hover:opacity-70 [&>svg]:size-4"
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
              <Link href="/about" className="transition-colors hover:text-primary">
                {tFooter("aboutUs")}
              </Link>
              <Link href="/contact" className="transition-colors hover:text-primary">
                {tFooter("contactTitle")}
              </Link>
              <Link href="/terms" className="transition-colors hover:text-primary">
                {tFooter("termsTitle")}
              </Link>
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

        <nav
          onMouseLeave={scheduleMegaMenuClose}
          className="hidden items-center gap-6 text-sm font-medium lg:flex"
        >
          {topLevelCategories.map((category) => {
            const href = `/${category.slug}`;
            const isActive = pathname === href;
            return (
              <div key={category.id} onMouseEnter={() => openMegaMenu(category.id)}>
                <Link
                  href={href}
                  className={`transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {category.name[locale]}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <WishlistDropdown initialCount={wishlistCount} />
          <CompareDropdown initialCount={compareCount} />
          <CartDropdown initialCount={cartCount} />

          {user ? (
            <div ref={accountMenuRef} className="relative hidden lg:block">
              <button
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
                    <Link
                      href="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      {tHeader("myAccount")}
                    </Link>
                  </li>
                  <li className="border-t border-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted hover:text-primary"
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
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
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
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? tHeader("closeMenu") : tHeader("openMenu")}
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary sm:size-9 lg:hidden"
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
              {isOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {activeCategory && activeChildren.length > 0 && (
        <div
          onMouseEnter={cancelMegaMenuClose}
          onMouseLeave={scheduleMegaMenuClose}
          className="absolute inset-x-0 top-full hidden border-b border-border bg-background shadow-lg lg:block"
        >
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
              {activeChildren.map((child) => {
                const imageUrl = resolveMediaUrl(child.imageUrl);
                return (
                  <Link
                    key={child.id}
                    href={`/${child.slug}`}
                    onClick={() => setActiveCategoryId(null)}
                    className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-muted"
                  >
                    {imageUrl ? (
                      <div className="relative size-16 overflow-hidden rounded-lg border border-border">
                        <Image
                          src={imageUrl}
                          alt={child.name[locale]}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-16 rounded-lg border border-dashed border-border" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {child.name[locale]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        id="mobile-nav"
        className={`grid overflow-hidden border-b border-border transition-[grid-template-rows] duration-200 ease-out lg:hidden ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
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
                      className="text-primary transition-opacity hover:opacity-70 [&>svg]:size-4"
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
            {topLevelCategories.map((category) => {
              const href = `/${category.slug}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={category.id}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-lg px-3 py-2.5 transition-colors hover:bg-muted hover:text-primary ${
                    isActive ? "text-primary" : "text-foreground"
                  }`}
                >
                  {category.name[locale]}
                </Link>
              );
            })}

            <div className="my-2 border-t border-border" />

            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tFooter("aboutUs")}
            </Link>

            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tFooter("contactTitle")}
            </Link>

            <Link
              href="/terms"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tFooter("termsTitle")}
            </Link>

            <div className="my-2 border-t border-border" />

            <Link
              href="/wishlist"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tHeader("wishlist")}
              {wishlistCount > 0 && <span className="text-muted-foreground"> ({wishlistCount})</span>}
            </Link>

            <Link
              href="/compare"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tHeader("compare")}
              {compareCount > 0 && <span className="text-muted-foreground"> ({compareCount})</span>}
            </Link>

            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
            >
              {tHeader("cart")}
              {cartCount > 0 && <span className="text-muted-foreground"> ({cartCount})</span>}
            </Link>

            {user ? (
              <>
                <Link
                  href="/account"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 rounded-lg px-3 py-2.5 text-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  {tHeader("myAccount")}
                </Link>
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
                  className="mt-2 rounded-lg border border-border px-3 py-2.5 text-center font-semibold text-foreground transition-colors hover:bg-muted hover:text-primary"
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
        </div>
      </div>
    </header>
  );
}
