import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ImageCarousel, type CarouselImage } from "@/components/shared/ImageCarousel";
import { getPublicTeamMembersFromServer } from "@/lib/api/server";
import { resolveMediaUrl } from "@/lib/api/client";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { siteConfig } from "@/config/site";

// Static, hand-authored page (not admin/DB-driven) — heavy on images/text/
// a slider, unlike the single admin-edited rich-text block Terms uses.
// Swap these in once the real photos are dropped into public/about/ — each
// slot renders a placeholder box until then (see ImageCarousel.tsx).
const INTRO_IMAGE_SRC = "";
const GALLERY_IMAGE_COUNT = 4;

const whyUsIcons = {
  quality: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <path d="M12 3 4 6v6c0 4.5 3.2 7.9 8 9 4.8-1.1 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  delivery: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <path d="M2 8h11v9H2z" />
      <path d="M13 11h4l4 3v3h-8z" />
      <circle cx="6.5" cy="19" r="1.5" />
      <circle cx="17.5" cy="19" r="1.5" />
    </svg>
  ),
  experience: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <circle cx="12" cy="8" r="5" />
      <path d="m8.5 12.5-2 8 5.5-3 5.5 3-2-8" />
    </svg>
  ),
  support: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M20 13v4a2 2 0 0 1-2 2h-1" />
      <rect x="2" y="13" width="4" height="6" rx="1" />
      <rect x="18" y="13" width="4" height="6" rx="1" />
    </svg>
  ),
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title = t("aboutTitle", { siteName: siteConfig.name });
  const description = t("aboutDescription", { siteName: siteConfig.name });
  const pathname = "/about";

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    openGraph: { title, description },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("About");
  const locale = (await getLocale()) as "ka" | "en" | "ru";
  const team = await getPublicTeamMembersFromServer();

  const whyUsItems = [
    { icon: whyUsIcons.quality, title: t("whyUs1Title"), description: t("whyUs1Description") },
    { icon: whyUsIcons.delivery, title: t("whyUs2Title"), description: t("whyUs2Description") },
    { icon: whyUsIcons.experience, title: t("whyUs3Title"), description: t("whyUs3Description") },
    { icon: whyUsIcons.support, title: t("whyUs4Title"), description: t("whyUs4Description") },
  ];

  const galleryImages: CarouselImage[] = Array.from({ length: GALLERY_IMAGE_COUNT }, (_, index) => ({
    src: "",
    alt: t("galleryImageAlt", { number: index + 1 }),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>

      <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">{t("introHeading")}</h2>
          <p className="text-base leading-7 text-muted-foreground">{t("introParagraph1")}</p>
          <p className="text-base leading-7 text-muted-foreground">{t("introParagraph2")}</p>
        </div>
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-border bg-muted">
          {INTRO_IMAGE_SRC ? (
            <Image src={INTRO_IMAGE_SRC} alt={t("introHeading")} fill className="object-cover" />
          ) : (
            <div className="size-full border border-dashed border-border" />
          )}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="mb-5 text-xl font-bold tracking-tight">{t("galleryHeading")}</h2>
        <ImageCarousel images={galleryImages} />
      </div>

      <div className="mt-16">
        <h2 className="mb-6 text-xl font-bold tracking-tight">{t("whyUsHeading")}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {whyUsItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {team.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-bold tracking-tight">{t("teamHeading")}</h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {team.map((member) => {
              const photoUrl = resolveMediaUrl(member.imageUrl);
              return (
                <div key={member.id} className="flex flex-col items-center text-center">
                  <div className="relative size-28 overflow-hidden rounded-full bg-muted">
                    {photoUrl ? (
                      <Image src={photoUrl} alt={member.name[locale]} fill className="object-cover" />
                    ) : (
                      <div className="size-full border border-dashed border-border" />
                    )}
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{member.name[locale]}</p>
                  <p className="text-sm text-muted-foreground">{member.role[locale]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
