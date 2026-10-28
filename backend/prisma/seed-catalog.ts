import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/config/prisma.js";
import type { Prisma } from "../src/generated/prisma/index.js";

// Vehicle catalog entries (years/specs/descriptions) from the client's
// prisma/data/vehicle_catalog.csv — one row per model of
// prisma/data/brands_models.csv, so run prisma/seed.ts and
// prisma/seed-brands.ts first. The file's brandId/modelId are
// brands_models.csv's numbering; they're resolved to this database's ids by
// brand/model name, so the seed works even where the database numbered them
// differently. Lookup ids (fuelTypeId, …) follow prisma/seed.ts's lookup
// order and are resolved by key the same way. Whole-number columns that the
// file gives with decimals (e.g. 178.6 cc) are rounded. Run via
// `npx tsx prisma/seed-catalog.ts` — safe to re-run: an entry that already
// exists (same model + variant + years) is left untouched; only missing rows
// are added.

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "data");

// File lookup id → key (the order prisma/seed.ts creates them in).
const LOOKUP_KEYS = {
  fuelTypeId: ["PETROL", "ELECTRIC"],
  transmissionTypeId: ["MANUAL", "AUTOMATIC", "CVT", "SEMI_AUTOMATIC"],
  coolingTypeId: ["AIR", "LIQUID", "OIL"],
  finalDriveTypeId: ["CHAIN", "BELT", "SHAFT"],
  driveTypeId: ["TWO_WD", "FOUR_WD"],
  startTypeId: ["ELECTRIC", "KICK", "BOTH"],
  powertrainTypeId: ["COMBUSTION", "ELECTRIC"],
} as const;

const INT_COLUMNS = [
  "yearFrom",
  "yearTo",
  "engineVolumeCc",
  "enginePowerHp",
  "cylinderCount",
  "gearCount",
  "seatCount",
  "weightKg",
  "seatHeightMm",
  "topSpeedKmh",
  "motorPowerWatt",
  "batteryCapacityWh",
  "rangeKm",
  "chargingTimeMinutes",
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Rows as header → value records. Handles quoted fields (the descriptions
// contain commas) and "" escapes.
function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(resolve(DATA_DIR, file), "utf8").replace(/^\u{FEFF}/u, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  const [header, ...data] = rows;
  return data.map((values) => Object.fromEntries(header.map((name, index) => [name.trim(), (values[index] ?? "").trim()])));
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`Not a number: ${value}`);
  return num;
}

function toBoolean(value: string): boolean | null {
  if (!value) return null;
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  throw new Error(`Not a boolean: ${value}`);
}

async function main() {
  // brands_models.csv's model id → this database's model (by brand + model slug).
  const modelNameById = new Map(
    readCsv("brands_models.csv").map((row) => [
      row.modelId,
      { brandSlug: slugify(row.Brand), modelSlug: slugify(row.Model.replace(/\s+/g, " ")) },
    ]),
  );
  const dbModels = await prisma.model.findMany({ select: { id: true, slug: true, brandId: true, brand: { select: { slug: true } } } });
  const dbModelBySlug = new Map(dbModels.map((model) => [`${model.brand.slug}/${model.slug}`, model]));

  const lookupIds: Record<keyof typeof LOOKUP_KEYS, Map<string, number>> = {
    fuelTypeId: new Map((await prisma.fuelType.findMany()).map((row) => [row.key, row.id])),
    transmissionTypeId: new Map((await prisma.transmissionType.findMany()).map((row) => [row.key, row.id])),
    coolingTypeId: new Map((await prisma.coolingType.findMany()).map((row) => [row.key, row.id])),
    finalDriveTypeId: new Map((await prisma.finalDriveType.findMany()).map((row) => [row.key, row.id])),
    driveTypeId: new Map((await prisma.driveType.findMany()).map((row) => [row.key, row.id])),
    startTypeId: new Map((await prisma.startType.findMany()).map((row) => [row.key, row.id])),
    powertrainTypeId: new Map((await prisma.powertrainType.findMany()).map((row) => [row.key, row.id])),
  };
  function lookupId(column: keyof typeof LOOKUP_KEYS, value: string): number | null {
    const fileId = toNumber(value);
    if (fileId === null) return null;
    const key = LOOKUP_KEYS[column][fileId - 1];
    const id = key && lookupIds[column].get(key);
    if (!id) throw new Error(`Unknown ${column}: ${value} (run prisma/seed.ts first)`);
    return id;
  }

  const entries = readCsv("vehicle_catalog.csv").map((row, index): Prisma.VehicleCatalogCreateManyInput => {
    const line = index + 2;
    const name = modelNameById.get(String(toNumber(row.modelId)));
    if (!name) throw new Error(`Line ${line}: modelId ${row.modelId} isn't in brands_models.csv`);
    const model = dbModelBySlug.get(`${name.brandSlug}/${name.modelSlug}`);
    if (!model) throw new Error(`Line ${line}: model ${name.brandSlug}/${name.modelSlug} missing (run prisma/seed-brands.ts first)`);

    const ints = Object.fromEntries(
      INT_COLUMNS.map((column) => {
        const num = toNumber(row[column]);
        return [column, num === null ? null : Math.round(num)];
      }),
    );
    return {
      brandId: model.brandId,
      modelId: model.id,
      variant: row.variant,
      ...ints,
      fuelTankLiters: toNumber(row.fuelTankLiters),
      oilCapacityLiters: toNumber(row.oilCapacityLiters),
      hasAbs: toBoolean(row.hasAbs),
      hasLockingDifferential: toBoolean(row.hasLockingDifferential),
      fuelTypeId: lookupId("fuelTypeId", row.fuelTypeId),
      transmissionTypeId: lookupId("transmissionTypeId", row.transmissionTypeId),
      coolingTypeId: lookupId("coolingTypeId", row.coolingTypeId),
      finalDriveTypeId: lookupId("finalDriveTypeId", row.finalDriveTypeId),
      driveTypeId: lookupId("driveTypeId", row.driveTypeId),
      startTypeId: lookupId("startTypeId", row.startTypeId),
      powertrainTypeId: lookupId("powertrainTypeId", row.powertrainTypeId),
      descriptionKa: row.descriptionKa || null,
      descriptionEn: row.descriptionEn || null,
      descriptionRu: row.descriptionRu || null,
    };
  });

  // An empty table (e.g. after a wipe) starts numbering from 1 again.
  if ((await prisma.vehicleCatalog.count()) === 0) {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('dbo."VehicleCatalog"', 'id'), 1, false)`);
  }

  // skipDuplicates relies on the (modelId, variant, yearFrom, yearTo)
  // NULLS NOT DISTINCT unique index.
  const created = await prisma.vehicleCatalog.createMany({ data: entries, skipDuplicates: true });
  console.log(`Vehicle catalog: ${created.count} created, ${entries.length - created.count} already existed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
