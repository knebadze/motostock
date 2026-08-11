import Image from "next/image";
import { useTranslations } from "next-intl";
import { AboutGallery, type AboutGalleryImage } from "@/components/about/AboutGallery";

// Static, hand-authored page (not admin/DB-driven) — heavy on images/text/
// a slider, unlike the single admin-edited rich-text block Terms uses.
// Swap these in once the real photos are dropped into public/about/ — each
// slot renders a placeholder box until then (see AboutGallery.tsx).
const INTRO_IMAGE_SRC = "";
const GALLERY_IMAGES: AboutGalleryImage[] = [
  { src: "", alt: "სამუშაო სივრცე 1" },
  { src: "", alt: "სამუშაო სივრცე 2" },
  { src: "", alt: "სამუშაო სივრცე 3" },
  { src: "", alt: "სამუშაო სივრცე 4" },
];

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

export default function AboutPage() {
  const t = useTranslations("About");

  const whyUsItems = [
    { icon: whyUsIcons.quality, title: t("whyUs1Title"), description: t("whyUs1Description") },
    { icon: whyUsIcons.delivery, title: t("whyUs2Title"), description: t("whyUs2Description") },
    { icon: whyUsIcons.experience, title: t("whyUs3Title"), description: t("whyUs3Description") },
    { icon: whyUsIcons.support, title: t("whyUs4Title"), description: t("whyUs4Description") },
  ];

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
        <AboutGallery images={GALLERY_IMAGES} />
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
    </div>
  );
}
