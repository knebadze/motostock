import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { sendEmailTemplate } from "../email-templates/email-templates.service.js";
import { getAdminNotificationEmail } from "../settings/settings.service.js";
import { callbackRequestsRepository } from "./callback-requests.repository.js";
import type { CreateCallbackRequestInput, ListCallbackRequestsQuery } from "./callback-requests.schema.js";

// "Call me back" from a showroom-only listing page (guests too). Lands in
// the admin requests inbox + header badge, and is emailed to the admin
// address (best-effort). Nothing else happens automatically.
export async function createCallbackRequest(input: CreateCallbackRequestInput) {
  const listing = await callbackRequestsRepository.findListingForRequest(input.vehicleListingId);
  if (!listing) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა", "VEHICLE_LISTING_NOT_FOUND");
  }
  const itemTitle = [
    listing.vehicleCatalog.brand.name,
    listing.vehicleCatalog.model.name,
    listing.vehicleCatalog.variant,
    String(listing.year),
  ]
    .filter(Boolean)
    .join(" ");

  const request = await callbackRequestsRepository.create({
    vehicleListingId: listing.id,
    itemTitle,
    name: input.name,
    phone: input.phone,
    preferredTime: input.preferredTime || null,
    note: input.note || null,
  });

  void getAdminNotificationEmail()
    .then((adminNotificationEmail) => {
      if (!adminNotificationEmail) return;
      return sendEmailTemplate("CALLBACK_REQUEST_ADMIN", adminNotificationEmail, {
        customerName: input.name,
        phone: input.phone,
        itemTitle,
        preferredTime: input.preferredTime || "—",
        note: input.note || "—",
      });
    })
    .catch((err: unknown) => logger.error({ err, requestId: request.id }, "CALLBACK_REQUEST_ADMIN email failed"));

  return { id: request.id };
}

type AdminRow = NonNullable<Awaited<ReturnType<typeof callbackRequestsRepository.findByIdForAdmin>>>;

function toResponse(row: AdminRow) {
  return {
    id: row.id,
    itemTitle: row.itemTitle,
    vehicleListing: row.vehicleListing,
    name: row.name,
    phone: row.phone,
    preferredTime: row.preferredTime,
    note: row.note,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    resolvedBy: row.resolvedBy,
  };
}

export async function listCallbackRequests(query: ListCallbackRequestsQuery) {
  const rows = await callbackRequestsRepository.findManyForAdmin(query.status);
  return rows.map(toResponse);
}

export function countOpenCallbackRequests() {
  return callbackRequestsRepository.countOpen();
}

export async function resolveCallbackRequest(id: number, adminUserId: number, adminNote: string | undefined) {
  const result = await callbackRequestsRepository.resolve(id, adminUserId, adminNote?.trim() || null);
  if (result.count === 0) {
    const existing = await callbackRequestsRepository.findByIdForAdmin(id);
    if (!existing) throw new ApiError(404, "თხოვნა ვერ მოიძებნა");
    throw new ApiError(409, "თხოვნა უკვე დამუშავებულია");
  }
  return toResponse((await callbackRequestsRepository.findByIdForAdmin(id))!);
}
