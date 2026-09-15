import { ApiError } from "../../lib/ApiError.js";
import { resolvePage } from "../../lib/pagination.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { applyBulkDiscounts } from "../bulk-discounts/bulk-discounts.service.js";
import { bulkDiscountEventsRepository } from "./bulk-discount-events.repository.js";
import type {
  BulkDiscountEventInput,
  ListBulkDiscountEventsQuery,
  RepeatBulkDiscountEventInput,
} from "./bulk-discount-events.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";

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
