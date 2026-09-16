import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { resolvePage } from "../../lib/pagination.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";
import { applyBulkDiscounts } from "../bulk-discounts/bulk-discounts.service.js";
import { toResponse as toHeroSlideResponse, type HeroSlideRow } from "../hero-slides/hero-slides.service.js";
import { bulkDiscountEventsRepository } from "./bulk-discount-events.repository.js";
import type {
  BulkDiscountEventHeroSlideInput,
  BulkDiscountEventInput,
  ListBulkDiscountEventsQuery,
  RepeatBulkDiscountEventInput,
} from "./bulk-discount-events.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";

// Included on every prisma.heroSlide read/write below, so the mapped
// response's bulkDiscountEvent carries enough for the storefront to render
// the "-X% | start – end" line under the slide's title (see HeroSlider.tsx) —
// same shape hero-slides.repository.ts's own discountBulkEventInclude uses.
const heroSlideDiscountBulkEventInclude = {
  discountBulkEvent: {
    select: { id: true, targetType: true, discountPercent: true, startDate: true, endDate: true },
  },
} as const;

type EventRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  imageUrl: string | null;
  targetType: "PRODUCT" | "VEHICLE_LISTING";
  discountPercent: { toString(): string };
  startDate: Date;
  endDate: Date;
  itemCount: number;
  heroSlide: { id: number } | null;
  createdAt: Date;
};

function toResponse(row: EventRow) {
  return {
    id: row.id,
    nameKa: row.nameKa,
    nameEn: row.nameEn,
    nameRu: row.nameRu,
    descriptionKa: row.descriptionKa,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    imageUrl: row.imageUrl,
    targetType: row.targetType,
    discountPercent: Number(row.discountPercent),
    startDate: row.startDate,
    endDate: row.endDate,
    itemCount: row.itemCount,
    heroSlideId: row.heroSlide?.id ?? null,
    createdAt: row.createdAt,
  };
}

function buildWhere(filters: ListBulkDiscountEventsQuery): Prisma.BulkDiscountEventWhereInput | undefined {
  return filters.targetType ? { targetType: filters.targetType } : undefined;
}

export async function listEvents(filters: ListBulkDiscountEventsQuery) {
  const { page, pageSize, skip, take } = resolvePage(filters);
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    bulkDiscountEventsRepository.findMany(where, skip, take),
    bulkDiscountEventsRepository.count(where),
  ]);

  return { items: rows.map(toResponse), total, page, pageSize };
}

// Re-runs the exact same batch (same items, same percent, same
// name/description/image) at new dates, as a brand-new event row — history
// is preserved (the source event and its dates stay exactly as they were),
// not edited in place. Reuses the existing applyBulkDiscounts service
// function directly (it only imports this module's *repository*, not this
// service file, so there's no import cycle) so a repeat goes through
// exactly the same validation/pricing/transaction path a fresh bulk apply
// does.
export async function repeatEvent(id: number, input: RepeatBulkDiscountEventInput) {
  const event = await bulkDiscountEventsRepository.findWithItemIds(id);
  if (!event) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  const eventInput = {
    nameKa: event.nameKa,
    nameEn: event.nameEn,
    nameRu: event.nameRu,
    descriptionKa: event.descriptionKa ?? undefined,
    descriptionEn: event.descriptionEn ?? undefined,
    descriptionRu: event.descriptionRu ?? undefined,
  };
  const discountPercent = Number(event.discountPercent);

  const itemIds =
    event.targetType === "PRODUCT"
      ? event.productDiscounts.map((row) => row.productVariantId)
      : event.vehicleDiscounts.map((row) => row.vehicleListingId);
  if (itemIds.length === 0) {
    throw new ApiError(
      400,
      event.targetType === "PRODUCT"
        ? "ამ ივენთის ვარიანტები აღარ არსებობს — გამეორება ვერ მოხერხდება"
        : "ამ ივენთის განცხადებები აღარ არსებობს — გამეორება ვერ მოხერხდება",
    );
  }

  const { eventId } = await applyBulkDiscounts({
    targetType: event.targetType,
    itemIds,
    discountPercent,
    startDate: input.startDate,
    endDate: input.endDate,
    event: eventInput,
  });

  if (eventId == null) {
    // Can't actually happen — eventInput above is always passed, so
    // applyBulk*Discounts always creates one — but keep this explicit
    // rather than a non-null assertion.
    throw new ApiError(500, "ივენთის გამეორება ვერ მოხერხდა");
  }

  // Reuses the same image by reference rather than re-uploading it — see
  // setEventImage's own comment for why an event's image is never
  // auto-deleted (this sharing is exactly why).
  if (event.imageUrl) {
    await bulkDiscountEventsRepository.updateImage(eventId, event.imageUrl);
  }

  const created = await bulkDiscountEventsRepository.findById(eventId);
  return toResponse(created!);
}

// Metadata-only — name/description, the same fields the apply flow's own
// optional `event` sub-object accepts. discountPercent/startDate/endDate/
// targetType/itemCount describe the actual discount rows this event grouped
// and aren't editable here — see repeatEvent above for re-running the batch
// at new dates instead.
export async function updateEvent(id: number, input: BulkDiscountEventInput) {
  const existing = await bulkDiscountEventsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  const row = await bulkDiscountEventsRepository.update(id, {
    nameKa: input.nameKa,
    nameEn: input.nameEn,
    nameRu: input.nameRu,
    descriptionKa: input.descriptionKa ?? null,
    descriptionEn: input.descriptionEn ?? null,
    descriptionRu: input.descriptionRu ?? null,
  });
  return toResponse(row);
}

export async function setEventImage(id: number, file: Express.Multer.File) {
  const existing = await bulkDiscountEventsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("bulk-discount-events", file);
  const row = await bulkDiscountEventsRepository.updateImage(id, imageUrl);
  // Unlike hero-slides.service.ts's setHeroSlideImage, the previous image is
  // deliberately NOT deleted here (no deleteUploadedImage call) — repeatEvent
  // above can point a second, independent event row at this same imageUrl
  // (copied by reference, not re-uploaded), so deleting "the old file" on a
  // replace could silently break an unrelated event still referencing it.
  // Accepted trade-off: a replaced image becomes an orphaned file rather
  // than risking that.
  return toResponse(row);
}

// ============================ Hero-slider slide ============================
// One HeroSlide per event (discountBulkEventId is @unique — see hero-slide.
// prisma), created/edited/imaged entirely from here via prisma.heroSlide
// directly, never through heroSlidesRepository/hero-slides.service.ts's own
// create/update — those never reference discountBulkEventId at all, so the
// general Hero Slides Manager can't see or clear this link even by
// accident. toHeroSlideResponse (hero-slides.service.ts's own toResponse,
// exported for reuse) maps the row the same way that module's own endpoints
// do, so the frontend gets one consistent HeroSlide shape either way.

export async function getEventHeroSlide(eventId: number) {
  const event = await bulkDiscountEventsRepository.findById(eventId);
  if (!event) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  const row = await prisma.heroSlide.findUnique({
    where: { discountBulkEventId: eventId },
    include: heroSlideDiscountBulkEventInclude,
  });
  if (!row) {
    throw new ApiError(404, "ამ ივენთს სლაიდი ჯერ არ აქვს შექმნილი");
  }
  return toHeroSlideResponse(row as HeroSlideRow);
}

// Create-or-update (upsert), keyed on the unique discountBulkEventId — one
// button in the admin UI covers both cases. Deliberately narrower than the
// general hero-slides create/update: no type/category/brand/buttonLink/
// textPosition/verticalPosition inputs — this is always a DISCOUNT slide,
// always event-scoped (never category/brand-scoped), with fixed
// LEFT/BOTTOM positioning and isActive defaulting true, matching what a
// one-button "make me a slide for this campaign" action should ask for.
// imageUrl is set only on create (from the event's own image, shared by
// reference — see setEventImage's comment for the same trade-off) and never
// touched here afterward; changing the slide's image is setEventHeroSlideImage's
// job, kept separate the same way every other image-bearing form in this
// codebase two-steps "save fields" from "upload image".
export async function setEventHeroSlide(eventId: number, input: BulkDiscountEventHeroSlideInput) {
  const event = await bulkDiscountEventsRepository.findById(eventId);
  if (!event) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  const row = await withNextSortOrderLock("HeroSlide", async (tx) => {
    const { _max } = await tx.heroSlide.aggregate({ _max: { sortOrder: true } });
    return tx.heroSlide.upsert({
      where: { discountBulkEventId: eventId },
      create: {
        type: "DISCOUNT",
        titleKa: input.title.ka,
        titleEn: input.title.en,
        titleRu: input.title.ru,
        subtitleKa: input.subtitle?.ka ?? null,
        subtitleEn: input.subtitle?.en ?? null,
        subtitleRu: input.subtitle?.ru ?? null,
        buttonLabelKa: input.buttonLabel.ka,
        buttonLabelEn: input.buttonLabel.en,
        buttonLabelRu: input.buttonLabel.ru,
        buttonLink: null,
        imageUrl: event.imageUrl,
        discountCategoryId: null,
        discountProductBrandId: null,
        discountBulkEventId: eventId,
        textPosition: "LEFT",
        verticalPosition: "BOTTOM",
        isActive: true,
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
      update: {
        titleKa: input.title.ka,
        titleEn: input.title.en,
        titleRu: input.title.ru,
        subtitleKa: input.subtitle?.ka ?? null,
        subtitleEn: input.subtitle?.en ?? null,
        subtitleRu: input.subtitle?.ru ?? null,
        buttonLabelKa: input.buttonLabel.ka,
        buttonLabelEn: input.buttonLabel.en,
        buttonLabelRu: input.buttonLabel.ru,
      },
      include: heroSlideDiscountBulkEventInclude,
    });
  });

  return toHeroSlideResponse(row as HeroSlideRow);
}

export async function setEventHeroSlideImage(eventId: number, file: Express.Multer.File) {
  const existing = await prisma.heroSlide.findUnique({ where: { discountBulkEventId: eventId } });
  if (!existing) {
    throw new ApiError(404, "ამ ივენთს სლაიდი ჯერ არ აქვს შექმნილი");
  }

  const imageUrl = await saveUploadedImage("hero-slides", file);
  const row = await prisma.heroSlide.update({
    where: { discountBulkEventId: eventId },
    data: { imageUrl },
    include: heroSlideDiscountBulkEventInclude,
  });
  // No deleteUploadedImage call — same reason as setEventImage above: the
  // previous image may still be this event's own shared file (or a sibling
  // repeated event's copy of it).
  return toHeroSlideResponse(row as HeroSlideRow);
}

export async function deleteEvent(id: number) {
  const existing = await bulkDiscountEventsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ივენთი ვერ მოიძებნა");
  }

  // No deleteUploadedImage call here either — same image-sharing reason as
  // setEventImage above. The FK on ProductVariantDiscount/VehicleListingDiscount
  // is SetNull (see bulk-discount-event.prisma), so deleting this row never
  // touches the discounts it grouped — they stay exactly as active/inactive
  // as they already were.
  await bulkDiscountEventsRepository.delete(id);
}
