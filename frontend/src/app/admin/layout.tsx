import type { Metadata } from "next";
import { RootShell } from "@/components/shared/RootShell";

export const metadata: Metadata = {
  title: "MotoStock — ადმინ პანელი",
  description: "მოტოსტოკის ადმინისტრირების პანელი.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootShell lang="ka">
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </RootShell>
  );
}
