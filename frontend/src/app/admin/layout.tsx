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
  return <RootShell lang="ka">{children}</RootShell>;
}
