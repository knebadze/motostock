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

  return (
    <>
      <Header user={user} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
