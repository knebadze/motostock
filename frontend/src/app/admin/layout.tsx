export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}
