import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { getCategoriesFromServer, getCurrentUserFromServer } from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, categories] = await Promise.all([
    getCurrentUserFromServer(),
    getCategoriesFromServer(),
  ]);
  const topLevelCategories = categories.filter((category) => category.parentId === null);

  return (
    <>
      <Header user={user} categories={topLevelCategories} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
