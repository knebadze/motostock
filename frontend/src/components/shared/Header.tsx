"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Logo } from "@/components/shared/Logo";
import { logoutUser, type User } from "@/lib/api/auth";
import { resolveMediaUrl } from "@/lib/api/client";
import type { Category } from "@/lib/api/categories";

const MEGA_MENU_CLOSE_DELAY_MS = 150;

export function Header({
  user = null,
  categories = [],
}: {
  user?: User | null;
  /** Full category tree (all depths) — the header derives top-level nav items and their children itself. */
  categories?: Category[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as "ka" | "en" | "ru";
  const tHeader = useTranslations("Header");
  const [isOpen, setIsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topLevelCategories = categories.filter((category) => category.parentId === null);
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center">
          <Logo className="h-8 w-auto sm:h-9" />
        </Link>

        <nav
          onMouseLeave={scheduleMegaMenuClose}
          className="hidden items-center gap-6 text-sm font-medium md:flex"
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

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <div ref={accountMenuRef} className="relative hidden md:block">
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
                <span>{user.name}</span>
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
            <div className="hidden items-center gap-2 md:flex">
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
            className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary md:hidden"
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
          className="absolute inset-x-0 top-full hidden border-b border-border bg-background shadow-lg md:block"
        >
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
        className={`grid overflow-hidden border-b border-border transition-[grid-template-rows] duration-200 ease-out md:hidden ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
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
