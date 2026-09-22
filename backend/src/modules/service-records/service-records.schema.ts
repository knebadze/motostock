import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { MAX_DECIMAL_10_2 } from "../../lib/money.js";
import { vehicleCatalogResponseSchema } from "../vehicle-catalog/vehicle-catalog.schema.js";

const servicePositionSchema = z.enum(["FRONT", "REAR", "BOTH"]);

// Either serviceTypeId (a templated ServiceType) or customServiceName (the
// admin typed a one-off service name) — never both, never neither. Same
// invariant as the DB CHECK constraint added in this feature's migration.
export const createServiceRecordSchema = registry.register(
  "CreateServiceRecordInput",
  z
    .object({
      garageVehicleId: z.coerce.number().int().positive(),
      serviceTypeId: z.coerce.number().int().positive().optional(),
      customServiceName: z.string().trim().min(1).max(200).optional(),
      mileageKm: z.coerce.number().int().nonnegative(),
      performedAt: z.iso.date(),
      position: servicePositionSchema.optional(),
      filterChanged: z.boolean().optional(),
      price: z.coerce.number().nonnegative().max(MAX_DECIMAL_10_2).optional().openapi({ example: 45 }),
      mechanicId: z.coerce.number().int().positive().optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .refine((data) => Boolean(data.serviceTypeId) !== Boolean(data.customServiceName), {
      message: "აირჩიეთ სერვისის ტიპი, ან შეიყვანეთ სახელი ხელით — არა ორივე ერთად და არც არცერთი",
      path: ["serviceTypeId"],
    }),
);
export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>;

// Only the "what actually happened" details are editable after creation —
// which service was performed (template vs. custom name) is fixed at
// creation to avoid re-litigating the xor invariant on every partial edit.
export const updateServiceRecordSchema = registry.register(
  "UpdateServiceRecordInput",
  z.object({
    mileageKm: z.coerce.number().int().nonnegative().optional(),
    performedAt: z.iso.date().optional(),
    position: servicePositionSchema.nullable().optional(),
    filterChanged: z.boolean().nullable().optional(),
    price: z.coerce.number().nonnegative().max(MAX_DECIMAL_10_2).nullable().optional(),
    mechanicId: z.coerce.number().int().positive().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
);
export type UpdateServiceRecordInput = z.infer<typeof updateServiceRecordSchema>;

export const serviceRecordIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listServiceRecordsQuerySchema = z.object({
  garageVehicleId: z.coerce.number().int().positive(),
});
export type ListServiceRecordsQuery = z.infer<typeof listServiceRecordsQuerySchema>;

// Workshop "სერვისის ისტორია" screen's admin-wide overview table (recently
// performed services across every customer/vehicle) — distinct from the
// per-vehicle query above, which always needs a garageVehicleId already
// picked. Same optional-page/pageSize shape as error-logs.schema.ts's
// errorLogsQuerySchema.
export const listServiceRecordsAdminQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  serviceTypeId: z.coerce.number().int().positive().optional(),
  mechanicId: z.coerce.number().int().positive().optional(),
  performedFrom: z.iso.date().optional(),
  performedTo: z.iso.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListServiceRecordsAdminQuery = z.infer<typeof listServiceRecordsAdminQuerySchema>;

export const serviceRecordResponseSchema = registry.register(
  "ServiceRecord",
  z.object({
    id: z.int().openapi({ example: 1 }),
    garageVehicleId: z.int(),
    serviceTypeId: z.int().nullable(),
    // Denormalized onto the record so history stays readable even after the
    // referenced ServiceType is deactivated (it's never deleted while
    // records reference it, but it can be turned off/renamed later).
    serviceTypeName: localizedStringSchema.nullable(),
    customServiceName: z.string().nullable(),
    mileageKm: z.int(),
    performedAt: z.iso.date(),
    position: servicePositionSchema.nullable(),
    filterChanged: z.boolean().nullable(),
    price: z.number().nullable(),
    mechanicId: z.int().nullable(),
    // Denormalized from the linked TeamMember, same reasoning as
    // serviceTypeName above.
    mechanicName: localizedStringSchema.nullable(),
    notes: z.string().nullable(),
    recordedByUserId: z.int().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    // Set only by create/update (see service-records.service.ts's
    // checkMileageMonotonicity) — a non-blocking heads-up that this record's
    // mileage looks out of order next to this vehicle's other records, not a
    // validation error. Absent on a plain list/get response.
    mileageWarning: z.string().nullable().optional(),
  }),
);

// The admin-wide overview table's row shape — everything the per-vehicle
// response has, plus who the vehicle belongs to and which vehicle it is,
// since this list spans every customer at once (the per-vehicle response
// above omits both, since the caller already knows them from having picked
// the vehicle first).
export const serviceRecordAdminResponseSchema = registry.register(
  "ServiceRecordAdmin",
  serviceRecordResponseSchema.extend({
    customerId: z.int(),
    customerName: z.string(),
    garageVehicleYear: z.int(),
    vehicleCatalog: vehicleCatalogResponseSchema,
  }),
);
