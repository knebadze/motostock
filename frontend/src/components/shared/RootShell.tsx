import { Noto_Sans_Georgian, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/shared/Toaster";
import "@/app/globals.css";

// Most of this site's content is Georgian — Geist (the create-next-app
// default) only ships a `latin` subset with no Georgian glyphs, so every
// Georgian heading/body text was silently falling back to the OS default
// font. Noto Sans Georgian covers both `georgian` and `latin` in one
// family, so Georgian text and Latin/numbers stay visually consistent.
const notoSans = Noto_Sans_Georgian({
  variable: "--font-sans",
  subsets: ["latin", "georgian"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export function RootShell({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  return (
    <html
      lang={lang}
      className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
