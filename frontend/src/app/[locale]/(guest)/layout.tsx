import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { CookieNotice } from "@/components/shared/CookieNotice";
import { ScrollToTopButton } from "@/components/shared/ScrollToTopButton";
import {
  getCategoriesFromServer,
  getCompanyInfoFromServer,
  getCurrentUserFromServer,
  getMyCartCountFromServer,
  getMyWishlistCountFromServer,
  getMyCompareCountFromServer,
} from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, categories, companyInfo, cartCount, wishlistCount, compareCount] = await Promise.all([
    getCurrentUserFromServer(),
    getCategoriesFromServer(),
    getCompanyInfoFromServer(),
    getMyCartCountFromServer(),
    getMyWishlistCountFromServer(),
    getMyCompareCountFromServer(),
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
    </>
  );
}
