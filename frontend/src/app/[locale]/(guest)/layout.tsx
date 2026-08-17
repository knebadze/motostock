import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { CookieNotice } from "@/components/shared/CookieNotice";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import { ChatWidget } from "@/components/shared/ChatWidget";
import {
  getCategoriesFromServer,
  getCompanyInfoFromServer,
  getCurrentUserFromServer,
  getFaqListFromServer,
  getMyCartCountFromServer,
  getMyWishlistCountFromServer,
  getMyCompareCountFromServer,
} from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, categories, companyInfo, cartCount, wishlistCount, compareCount, faqs] = await Promise.all([
    getCurrentUserFromServer(),
    getCategoriesFromServer(),
    getCompanyInfoFromServer(),
    getMyCartCountFromServer(),
    getMyWishlistCountFromServer(),
    getMyCompareCountFromServer(),
    getFaqListFromServer(),
  ]);

  return (
    <>
      <Header
        user={user}
        categories={categories}
        companyInfo={companyInfo}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        compareCount={compareCount}
      />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieNotice />
      <ScrollToTopButton />
      <ChatWidget faqs={faqs} phone={companyInfo.phone} />
    </>
  );
}
