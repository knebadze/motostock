"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/shared/Modal";
import { ImageCarousel, type CarouselImage } from "@/components/shared/ImageCarousel";

const IMAGES_PER_CARD = 3;

// Static, hand-authored content (not admin/DB-driven) — same convention as
// About page's "why us" grid: a fixed, small set of marketing cards, not an
// open-ended admin-managed list. Swap the src values in once real photos are
// available — each slot renders a placeholder box until then. Alt text is
// derived from the (translated) card title rather than hardcoded per-locale
// strings, so it stays correct in en/ru without needing 9 extra i18n keys.
function cardImages(title: string): CarouselImage[] {
  return Array.from({ length: IMAGES_PER_CARD }, (_, index) => ({
    src: "",
    alt: `${title} ${index + 1}`,
  }));
}

export function HomeInfoCardsSection() {
  const t = useTranslations("HomeInfoCards");
  const tCommon = useTranslations("Common");
  const [openCard, setOpenCard] = useState<"shop" | "service" | "drive" | null>(null);

  const cards = [
    { key: "shop" as const, title: t("shopTitle"), shortText: t("shopShort"), fullText: t("shopFull") },
    { key: "service" as const, title: t("serviceTitle"), shortText: t("serviceShort"), fullText: t("serviceFull") },
    { key: "drive" as const, title: t("driveTitle"), shortText: t("driveShort"), fullText: t("driveFull") },
  ];

  const activeCard = cards.find((card) => card.key === openCard) ?? null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <h2 className="mb-6 text-2xl font-bold tracking-tight sm:mb-8">{t("heading")}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {cards.map((card) => (
          <div
            key={card.key}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
          >
            <ImageCarousel images={cardImages(card.title)} aspectClassName="aspect-4/3" bordered={false} />
            <div className="flex flex-1 flex-col gap-2 p-4 sm:gap-3 sm:p-6">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">{card.title}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{card.shortText}</p>
              <button
                type="button"
                onClick={() => setOpenCard(card.key)}
                className="self-start text-sm font-semibold text-primary-text hover:underline"
              >
                {t("readMore")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={activeCard !== null}
        onClose={() => setOpenCard(null)}
        title={activeCard?.title ?? ""}
        size="xl"
        closeLabel={tCommon("modal.close")}
      >
        <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{activeCard?.fullText}</p>
      </Modal>
    </section>
  );
}
