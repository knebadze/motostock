import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {t("heading")}
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            {t("description")}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("backHome")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
