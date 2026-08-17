"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/shared/Modal";
import { ImageCarousel, type CarouselImage } from "@/components/shared/ImageCarousel";

// Static, hand-authored content (not admin/DB-driven) — same convention as
// About page's "why us" grid: a fixed, small set of marketing cards, not an
// open-ended admin-managed list. Swap the src values in once real photos are
// available — each slot renders a placeholder box until then.
const CARD_IMAGES: Record<"shop" | "service" | "drive", CarouselImage[]> = {
  shop: [
    { src: "", alt: "მაღაზია 1" },
    { src: "", alt: "მაღაზია 2" },
    { src: "", alt: "მაღაზია 3" },
  ],
  service: [
    { src: "", alt: "სერვისი 1" },
    { src: "", alt: "სერვისი 2" },
    { src: "", alt: "სერვისი 3" },
  ],
  drive: [
    { src: "", alt: "Drive 1" },
    { src: "", alt: "Drive 2" },
    { src: "", alt: "Drive 3" },
  ],
};

export function HomeInfoCardsSection() {
  const t = useTranslations("HomeInfoCards");
  const [openCard, setOpenCard] = useState<"shop" | "service" | "drive" | null>(null);

  const cards = [
    { key: "shop" as const, title: t("shopTitle"), shortText: t("shopShort"), fullText: t("shopFull") },
    { key: "service" as const, title: t("serviceTitle"), shortText: t("serviceShort"), fullText: t("serviceFull") },
    { key: "drive" as const, title: t("driveTitle"), shortText: t("driveShort"), fullText: t("driveFull") },
  ];

  const activeCard = cards.find((card) => card.key === openCard) ?? null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <h2 className="mb-8 text-2xl font-bold tracking-tight">{t("heading")}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.key}
            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
          >
            <ImageCarousel images={CARD_IMAGES[card.key]} aspectClassName="aspect-4/3" bordered={false} />
            <div className="flex flex-1 flex-col gap-3 p-6">
              <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{card.shortText}</p>
              <button
                type="button"
                onClick={() => setOpenCard(card.key)}
                className="self-start text-sm font-semibold text-primary hover:underline"
              >
                {t("readMore")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={activeCard !== null} onClose={() => setOpenCard(null)} title={activeCard?.title ?? ""} size="xl">
        <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{activeCard?.fullText}</p>
      </Modal>
    </section>
  );
}
