import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/config/prisma.js";

// Vehicle brands and models sold/serviced in Georgia, from the client's
// prisma/data/brands_models.csv (brandId,Brand,modelId,Model,Category,
// Subcategory). Ids are the database's own autoincrement — the file's id
// columns are ignored. When both tables are empty their sequences are
// restarted at 1 and rows are inserted in file order, so a fresh database
// gets the same numbering as the file. Each model is filed under its
// "მოტოტექნიკა" subcategory by the Category column (the finer Subcategory
// column has no matching category and isn't stored). No VehicleCatalog
// entries (years/specs) — those come from the catalog import. Separate from
// prisma/seed.ts so it can be run on its own. Run via
// `npx tsx prisma/seed-brands.ts` — safe to re-run: existing brands (same
// slug) and models (same brand + slug) are left untouched, so anything the
// admin edited is never overwritten; only missing rows are added.

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), "data", "brands_models.csv");

// The file's "Category" values → "მოტოტექნიკა" subcategory slugs.
const CATEGORY_SLUGS: Record<string, string> = {
  მოტოციკლი: "motorcycles",
  მოპედი: "mopeds",
  კვადროციკლი: "atvs",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  // Data rows (header skipped). No field in the file is quoted, so a plain
  // split is safe.
  const rows = readFileSync(FILE, "utf8")
    .replace(/^\u{FEFF}/u, "")
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => line.split(","));

  const categoryIdBySlug = new Map(
    (await prisma.category.findMany({ where: { slug: { in: Object.values(CATEGORY_SLUGS) } } })).map((category) => [
      category.slug,
      category.id,
    ]),
  );
  for (const slug of Object.values(CATEGORY_SLUGS)) {
    if (!categoryIdBySlug.has(slug)) throw new Error(`Unknown category slug: ${slug} (run prisma/seed.ts first)`);
  }

  // Empty tables (e.g. after a wipe) start numbering from 1 again.
  if ((await prisma.brand.count()) === 0 && (await prisma.model.count()) === 0) {
    for (const table of ["Brand", "Model"]) {
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('cla."${table}"', 'id'), 1, false)`);
    }
  }

  // Brands in file order, keyed by slug.
  const brands = new Map<string, string>();
  for (const [, rawBrand] of rows) {
    const name = rawBrand.trim();
    if (!brands.has(slugify(name))) brands.set(slugify(name), name);
  }
  const createdBrands = await prisma.brand.createMany({
    data: [...brands].map(([slug, name]) => ({ name, slug })),
    skipDuplicates: true,
  });
  console.log(`Brands: ${createdBrands.count} created, ${brands.size - createdBrands.count} already existed`);

  const brandIdBySlug = new Map(
    (await prisma.brand.findMany({ where: { slug: { in: [...brands.keys()] } }, select: { id: true, slug: true } })).map(
      (brand) => [brand.slug, brand.id],
    ),
  );
  const models = rows.map(([, rawBrand, , rawModel, rawCategory]) => {
    const categorySlug = CATEGORY_SLUGS[rawCategory.trim()];
    if (!categorySlug) throw new Error(`Unknown model category: ${rawCategory}`);
    const name = rawModel.trim().replace(/\s+/g, " ");
    return {
      brandId: brandIdBySlug.get(slugify(rawBrand.trim()))!,
      categoryId: categoryIdBySlug.get(categorySlug)!,
      name,
      slug: slugify(name),
    };
  });
  // skipDuplicates relies on Model's @@unique([brandId, slug]).
  const createdModels = await prisma.model.createMany({ data: models, skipDuplicates: true });
  console.log(`Models: ${createdModels.count} created, ${models.length - createdModels.count} already existed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
