import { getLocale } from "next-intl/server";
import { Header } from "@/components/shared/Header";
import { toHeaderCategories } from "@/lib/api/categories";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { Footer } from "@/components/shared/Footer";
import { CookieNotice } from "@/components/shared/CookieNotice";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { ChatWidget } from "@/components/shared/ChatWidget";
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

  return (
    <>
      <Header
        user={user}
        categories={toHeaderCategories(categories, typedLocale)}
        companyInfo={companyInfo}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        compareCount={compareCount}
        guestFeatureStatus={guestFeatureStatus}
      />
      <main className="flex-1">{children}</main>
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
