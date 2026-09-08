import ExcelJS from "exceljs";
import { ApiError } from "../../lib/ApiError.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import {
  assertNoDuplicate,
  assertRefsExist,
  DUPLICATE_VEHICLE_CATALOG_MESSAGE,
} from "./vehicle-catalog.service.js";
import { vehicleCatalogRepository } from "./vehicle-catalog.repository.js";
import { createVehicleCatalogSchema } from "./vehicle-catalog.schema.js";
import { DATA_COLUMNS } from "./vehicle-catalog-template.service.js";

const DATA_SHEET_NAME = "მონაცემები";

// Positional, 1-based column indices — derived from the same DATA_COLUMNS
// array the template generator writes headers from, so the two can never
// drift out of sync. Reads by position (not header text) so a template
// whose headers get retranslated/reworded still imports correctly.
const COLUMN_INDEX = Object.fromEntries(
  DATA_COLUMNS.map((col, index) => [col.key, index + 1]),
) as Record<(typeof DATA_COLUMNS)[number]["key"], number>;

function cellNumber(cell: ExcelJS.Cell): number | undefined {
  const value = cell.value;
  if (value == null || value === "") return undefined;
  const raw =
    typeof value === "object" && value !== null && "result" in value
      ? (value as { result: unknown }).result
      : value;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function cellString(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && value !== null && "richText" in value) {
    const text = (value as { richText: { text: string }[] }).richText.map((part) => part.text).join("");
    return text.trim() || undefined;
  }
  const text = String(value).trim();
  return text || undefined;
}

function cellBoolean(cell: ExcelJS.Cell): boolean | undefined {
  const value = cell.value;
  if (value == null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toUpperCase();
  if (text === "TRUE") return true;
  if (text === "FALSE") return false;
  return undefined;
}

type BulkImportRowResult = {
  row: number;
  status: "created" | "error";
  message: string | null;
  id: number | null;
};

// Best-effort, per-row — one bad row never blocks the rest of the file,
// same "partial success, detailed report" shape already established by
// orders.service.ts's reorderOrder. Row-level validation reuses the exact
// same zod schema and FK/duplicate checks as the single-row admin create
// endpoint (createVehicleCatalogSchema, assertRefsExist, assertNoDuplicate)
// so a bulk-imported row can never end up more (or less) permissive than
// one entered by hand.
export async function bulkImportVehicleCatalog(fileBuffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's declared `load(buffer: Buffer)` resolves its `Buffer` against
    // an older @types/node pulled in transitively via its fast-csv
    // dependency, which doesn't structurally match this project's — a
    // typings-only clash between two nominally-identical runtime Buffers.
    // The cast has to stay INLINE on the call expression, not hoisted into
    // a separate `const load = workbook.xlsx.load as ...` first — extracting
    // the method into its own variable detaches it from `workbook.xlsx`, so
    // calling it as a bare function loses the `this` binding `load()`'s own
    // implementation needs, and it fails immediately on every file
    // (verified live: `Cannot read properties of undefined (reading
    // 'parseRels')`), not just malformed ones — bulk import was completely
    // non-functional until this was caught by this session's own regression
    // test for a different fix.
    await (workbook.xlsx.load as unknown as (buffer: Buffer) => Promise<unknown>)(fileBuffer);
  } catch {
    throw new ApiError(400, "ფაილი ვერ იკითხება — დარწმუნდით, რომ ეს არის ვალიდური .xlsx ფაილი");
  }

  const sheet = workbook.getWorksheet(DATA_SHEET_NAME);
  if (!sheet) {
    throw new ApiError(
      400,
      `ფაილში ვერ მოიძებნა "${DATA_SHEET_NAME}" გვერდი — გამოიყენეთ შაბლონის ფორმატი`,
    );
  }

  const results: BulkImportRowResult[] = [];
  const seenInFile = new Set<string>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    const rawValues = Object.values(COLUMN_INDEX).map((colIndex) => row.getCell(colIndex).value);
    const isBlankRow = rawValues.every((value) => value == null || value === "");
    if (isBlankRow) continue;

    const candidate = {
      brandId: cellNumber(row.getCell(COLUMN_INDEX.brandId)),
      modelId: cellNumber(row.getCell(COLUMN_INDEX.modelId)),
      variant: cellString(row.getCell(COLUMN_INDEX.variant)),
      yearFrom: cellNumber(row.getCell(COLUMN_INDEX.yearFrom)),
      yearTo: cellNumber(row.getCell(COLUMN_INDEX.yearTo)),
      engineVolumeCc: cellNumber(row.getCell(COLUMN_INDEX.engineVolumeCc)),
      enginePowerHp: cellNumber(row.getCell(COLUMN_INDEX.enginePowerHp)),
      cylinderCount: cellNumber(row.getCell(COLUMN_INDEX.cylinderCount)),
      gearCount: cellNumber(row.getCell(COLUMN_INDEX.gearCount)),
      seatCount: cellNumber(row.getCell(COLUMN_INDEX.seatCount)),
      weightKg: cellNumber(row.getCell(COLUMN_INDEX.weightKg)),
      seatHeightMm: cellNumber(row.getCell(COLUMN_INDEX.seatHeightMm)),
      fuelTankLiters: cellNumber(row.getCell(COLUMN_INDEX.fuelTankLiters)),
      topSpeedKmh: cellNumber(row.getCell(COLUMN_INDEX.topSpeedKmh)),
      hasAbs: cellBoolean(row.getCell(COLUMN_INDEX.hasAbs)),
      fuelTypeId: cellNumber(row.getCell(COLUMN_INDEX.fuelTypeId)),
      transmissionTypeId: cellNumber(row.getCell(COLUMN_INDEX.transmissionTypeId)),
      coolingTypeId: cellNumber(row.getCell(COLUMN_INDEX.coolingTypeId)),
      finalDriveTypeId: cellNumber(row.getCell(COLUMN_INDEX.finalDriveTypeId)),
      driveTypeId: cellNumber(row.getCell(COLUMN_INDEX.driveTypeId)),
      startTypeId: cellNumber(row.getCell(COLUMN_INDEX.startTypeId)),
      powertrainTypeId: cellNumber(row.getCell(COLUMN_INDEX.powertrainTypeId)),
      motorPowerWatt: cellNumber(row.getCell(COLUMN_INDEX.motorPowerWatt)),
      batteryCapacityWh: cellNumber(row.getCell(COLUMN_INDEX.batteryCapacityWh)),
      rangeKm: cellNumber(row.getCell(COLUMN_INDEX.rangeKm)),
      chargingTimeMinutes: cellNumber(row.getCell(COLUMN_INDEX.chargingTimeMinutes)),
      hasLockingDifferential: cellBoolean(row.getCell(COLUMN_INDEX.hasLockingDifferential)),
      descriptionKa: cellString(row.getCell(COLUMN_INDEX.descriptionKa)),
      descriptionEn: cellString(row.getCell(COLUMN_INDEX.descriptionEn)),
      descriptionRu: cellString(row.getCell(COLUMN_INDEX.descriptionRu)),
    };

    const parsed = createVehicleCatalogSchema.safeParse(candidate);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      results.push({ row: rowNumber, status: "error", message, id: null });
      continue;
    }

    const data = parsed.data;
    const variant = data.variant ?? "";
    const dedupeKey = `${data.modelId}|${variant}|${data.yearFrom ?? ""}|${data.yearTo ?? ""}`;

    if (seenInFile.has(dedupeKey)) {
      results.push({
        row: rowNumber,
        status: "error",
        message: "დუბლირებული ჩანაწერი ამავე ფაილში (მოდელი + ვარიანტი + წლები)",
        id: null,
      });
      continue;
    }

    try {
      await assertRefsExist(data);
      await assertNoDuplicate({
        modelId: data.modelId,
        variant,
        yearFrom: data.yearFrom ?? null,
        yearTo: data.yearTo ?? null,
      });

      // Closes the same pre-check-then-write race the single-row create
      // paths in vehicle-catalog.service.ts already guard against (see
      // that file's createVehicleCatalogEntry) — a bulk import racing
      // another concurrent import, or a manual admin create, for the same
      // model+variant+years would otherwise degrade to a generic "უცნობი
      // შეცდომა" here instead of the same clean duplicate message.
      const created = await runUniqueCheckedWrite(
        () => vehicleCatalogRepository.create({ ...data, variant }),
        "yearFrom",
        DUPLICATE_VEHICLE_CATALOG_MESSAGE,
      );
      seenInFile.add(dedupeKey);
      results.push({ row: rowNumber, status: "created", message: null, id: created.id });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "უცნობი შეცდომა";
      results.push({ row: rowNumber, status: "error", message, id: null });
    }
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  return {
    totalRows: results.length,
    createdCount,
    errorCount: results.length - createdCount,
    results,
  };
}
