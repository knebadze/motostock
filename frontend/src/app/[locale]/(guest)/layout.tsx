import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import {
  getCategoriesFromServer,
  getCurrentUserFromServer,
  getMyCartCountFromServer,
} from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, categories, cartCount] = await Promise.all([
    getCurrentUserFromServer(),
    getCategoriesFromServer(),
    getMyCartCountFromServer(),
  ]);

  return (
    <>
      <Header user={user} categories={categories} cartCount={cartCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
