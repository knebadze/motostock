import { Header } from "@/components/shared/Header";

export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
    </>
  );
}
