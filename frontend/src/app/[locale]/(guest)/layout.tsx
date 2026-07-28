import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { getCurrentUserFromServer } from "@/lib/api/server";

export default async function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromServer();

  return (
    <>
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
