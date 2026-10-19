import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Header } from "@/components/shared/Header";
import { toHeaderCategories } from "@/lib/api/categories";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { Footer } from "@/components/shared/Footer";
import { CookieNotice } from "@/components/shared/CookieNotice";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { ChatWidget } from "@/components/shared/ChatWidget";
import { NavigationProgress } from "@/components/shared/NavigationProgress";
import {
  getCategoriesFromServer,
  getCompanyInfoFromServer,
  getCurrentUserFromServer,
  getFaqListFromServer,
  getGuestFeatureStatusFromServer,
  getMyCartCountFromServer,
  getMyWishlistCountFromServer,
  getMyCompareCountFromServer,
} from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, user, categories, companyInfo, cartCount, wishlistCount, compareCount, faqs, guestFeatureStatus] =
    await Promise.all([
      getLocale(),
      getCurrentUserFromServer(),
      getCategoriesFromServer(),
      getCompanyInfoFromServer(),
      getMyCartCountFromServer(),
      getMyWishlistCountFromServer(),
      getMyCompareCountFromServer(),
      getFaqListFromServer(),
      getGuestFeatureStatusFromServer(),
    ]);

  const typedLocale = locale as "ka" | "en" | "ru";
  const tCommon = await getTranslations("Common");

  return (
    <>
      {/* Skip link (WCAG 2.4.1) — the first Tab stop on every page: hidden
          until focused, then jumps past the header and category menu
          straight to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-70 focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        {tCommon("skipToContent")}
      </a>
      {/* useSearchParams needs a Suspense boundary of its own. */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Header
        user={user}
        categories={toHeaderCategories(categories, typedLocale)}
        companyInfo={companyInfo}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        compareCount={compareCount}
        guestFeatureStatus={guestFeatureStatus}
      />
      {/* The page's one <main> (nested layouts use plain elements) — the
          skip link's target; tabIndex lets it take focus. */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <CookieNotice />
      <ScrollToTopButton />
      <ChatWidget
        faqs={faqs.map((faq) => ({
          id: faq.id,
          question: faq.question[typedLocale],
          answerHtml: sanitizeRichText(faq.answer[typedLocale]),
        }))}
        whatsappChatEnabled={companyInfo.whatsappChatEnabled} />
    </>
  );
}
