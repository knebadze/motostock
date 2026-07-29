import type { Metadata } from "next";
import { RootShell } from "@/components/shared/RootShell";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `${siteConfig.name} — ადმინ პანელი`,
  description: "მოტოსტოკის ადმინისტრირების პანელი.",
  // Not public content — robots.txt also disallows /admin, this is the
  // standards-based double protection Google recommends on top of that.
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootShell lang="ka">{children}</RootShell>;
}
