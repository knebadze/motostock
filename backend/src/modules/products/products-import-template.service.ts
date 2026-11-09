import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndDescendantIds, resolveSizeScale } from "../categories/categories.service.js";
import { resolveAttributeCategoryIds, resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { listProductBrands } from "../product-brands/product-brands.service.js";

// Excel template for bulk-creating products under one category (see
// products-bulk-import.service.ts). Picked on a parent category ("ჩაფხუტები"),
// it covers its whole subtree: a "კატეგორია" column (dropdown of the
// category and its subcategories) says where each product goes, and the
// attribute / brand / size lists are those of the whole subtree — the
// importer then checks each product against ITS category's own rules. Every
// pick-from-a-list value is a dropdown of human-readable names, so the shop
// staff filling it never deal with ids; the importer maps the names back. A
// hidden _meta sheet records the category, the layout and which attribute
// each extra column is.

export const DATA_SHEET_NAME = "პროდუქტები";
export const META_SHEET_NAME = "_meta";
const LISTS_SHEET_NAME = "სიები";
const MAX_ROWS = 2000;

export const YES = "კი";
export const NO = "არა";

// _meta B3. Layout 2 added the "category" column (2nd); templates
// downloaded before it (no B3) are still read with LEGACY_FIXED_COLUMNS.
export const CURRENT_LAYOUT = 2;

// Positional (1-based) — the importer reads by position, not header text.
export const FIXED_COLUMNS = [
  { key: "group", header: "პროდუქტის № *", width: 14 },
  { key: "category", header: "კატეგორია", width: 30 },
  { key: "nameKa", header: "დასახელება (ka) *", width: 34 },
  { key: "nameEn", header: "დასახელება (en)", width: 30 },
  { key: "nameRu", header: "დასახელება (ru)", width: 30 },
  { key: "brand", header: "ბრენდი", width: 20 },
  { key: "descriptionKa", header: "აღწერა (ka)", width: 40 },
  { key: "descriptionEn", header: "აღწერა (en)", width: 30 },
  { key: "descriptionRu", header: "აღწერა (ru)", width: 30 },
  { key: "size", header: "ზომა", width: 12 },
  { key: "color", header: "ფერი", width: 14 },
  { key: "price", header: "ფასი (₾) *", width: 12 },
  { key: "stock", header: "მარაგი", width: 10 },
  { key: "sku", header: "SKU", width: 16 },
  { key: "finaId", header: "FINA ID", width: 12 },
  { key: "condition", header: "მდგომარეობა", width: 14 },
] as const;
export type FixedColumnKey = (typeof FIXED_COLUMNS)[number]["key"];
const LEGACY_FIXED_COLUMNS = FIXED_COLUMNS.filter((column) => column.key !== "category");

// Column positions for a template layout: key → 1-based column (no
// "category" in layout 1), plus how many fixed columns precede the
// attribute columns.
export function fixedColumnLayout(layout: number) {
  const columns = layout >= 2 ? FIXED_COLUMNS : LEGACY_FIXED_COLUMNS;
  const index = Object.fromEntries(columns.map((column, position) => [column.key, position + 1])) as Partial<
    Record<FixedColumnKey, number>
  >;
  return { index, count: columns.length };
}
const CURRENT_COLUMNS = fixedColumnLayout(CURRENT_LAYOUT);
const COLUMN = CURRENT_COLUMNS.index as Record<FixedColumnKey, number>;

function columnLetter(oneBasedIndex: number): string {
  let letter = "";
  let n = oneBasedIndex;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// exceljs's .d.ts omits Worksheet.dataValidations — see
// vehicle-catalog-template.service.ts's identical interface.
interface WorksheetWithDataValidations extends ExcelJS.Worksheet {
  dataValidations: { add(range: string, validation: ExcelJS.DataValidation): void };
}

// One category of the template's subtree, with the rules a product placed
// there must follow.
export type ImportCategory = {
  id: number;
  // "ჩაფხუტები › ინტეგრალური" — unique within the template (the dropdown value).
  label: string;
  attributeIds: Set<number>;
  brandIds: Set<number>;
  // Its effective size scale; null = any size allowed.
  sizeScaleId: number | null;
};

// What the template (and the importer) need to know about a category and
// its subtree.
export async function loadCategoryImportContext(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) throw new ApiError(404, "კატეგორია ვერ მოიძებნა");

  const ancestors = await resolveCategoryAndAncestorIds(categoryId);
  const root = await categoriesRepository.findById(ancestors[ancestors.length - 1]);
  if (root?.slug === "transport") {
    throw new ApiError(400, "ტექნიკა პროდუქტად არ იტვირთება — გამოიყენეთ ტექნიკის კატალოგი/განცხადებები");
  }

  // The subtree, depth-first in the shop's own order, labeled by path.
  const subtreeIds = await resolveCategoryAndDescendantIds(categoryId);
  const rows = await prisma.category.findMany({
    where: { id: { in: subtreeIds } },
    select: { id: true, nameKa: true, parentId: true },
    orderBy: [{ sortOrder: "asc" }, { nameKa: "asc" }],
  });
  const childrenOf = new Map<number, typeof rows>();
  for (const row of rows) {
    if (row.id === categoryId || row.parentId == null) continue;
    childrenOf.set(row.parentId, [...(childrenOf.get(row.parentId) ?? []), row]);
  }
  const ordered: { id: number; label: string }[] = [];
  const visit = (id: number, label: string) => {
    ordered.push({ id, label });
    for (const child of childrenOf.get(id) ?? []) visit(child.id, `${label} › ${child.nameKa}`);
  };
  visit(categoryId, category.nameKa);

  const [perCategory, brandsPage, colors, conditions] = await Promise.all([
    Promise.all(
      ordered.map(async (entry) => ({
        ...entry,
        attributeCategoryIds: await resolveAttributeCategoryIds(entry.id),
        ancestorIds: await resolveCategoryAndAncestorIds(entry.id),
        sizeScale: await resolveSizeScale(entry.id),
      })),
    ),
    // Brands of the whole subtree (linked to it, an ancestor or a descendant).
    listProductBrands({ categoryId, includeDescendants: "true" }),
    prisma.color.findMany({ orderBy: { nameKa: "asc" } }),
    prisma.condition.findMany({ orderBy: { id: "asc" } }),
  ]);

  const attributes = await prisma.attribute.findMany({
    where: { categoryId: { in: [...new Set(perCategory.flatMap((entry) => entry.attributeCategoryIds))] } },
    include: {
      options: { orderBy: { id: "asc" } },
      unit: { select: { abbreviationKa: true } },
    },
    orderBy: { id: "asc" },
  });
  const brands = brandsPage.items;

  const categories: ImportCategory[] = perCategory.map((entry) => {
    const ancestorIds = new Set(entry.ancestorIds);
    return {
      id: entry.id,
      label: entry.label,
      attributeIds: new Set(
        attributes.filter((attribute) => entry.attributeCategoryIds.includes(attribute.categoryId)).map((a) => a.id),
      ),
      // Same rule as the product form / products.service's brand check:
      // the brand is linked to the category or one of its ancestors.
      brandIds: new Set(
        brands.filter((brand) => brand.categories.some((link) => ancestorIds.has(link.id))).map((brand) => brand.id),
      ),
      sizeScaleId: entry.sizeScale?.id ?? null,
    };
  });

  // Sizes of every scale in the subtree; all sizes when some category has
  // no scale (it accepts any).
  const scaleIds = [...new Set(perCategory.map((entry) => entry.sizeScale?.id ?? null))];
  const sizes = await prisma.size.findMany({
    where: scaleIds.includes(null) ? undefined : { scaleId: { in: scaleIds as number[] } },
    orderBy: { id: "asc" },
  });
  // One scale for the whole subtree → its name as the size column's header.
  const sharedScale = scaleIds.length === 1 ? (perCategory[0].sizeScale ?? null) : null;

  // Attribute names can repeat across subcategories ("ტონირება" on visors and
  // goggles) — such columns get their category's name added to the header.
  const nameCounts = new Map<string, number>();
  for (const attribute of attributes) nameCounts.set(attribute.nameKa, (nameCounts.get(attribute.nameKa) ?? 0) + 1);
  const duplicateCategoryIds = [
    ...new Set(attributes.filter((attribute) => (nameCounts.get(attribute.nameKa) ?? 0) > 1).map((a) => a.categoryId)),
  ];
  const categoryNames = new Map(
    (
      await prisma.category.findMany({ where: { id: { in: duplicateCategoryIds } }, select: { id: true, nameKa: true } })
    ).map((row) => [row.id, row.nameKa]),
  );
  const attributeHeaders = new Map(
    attributes.map((attribute) => [
      attribute.id,
      attributeHeader(
        attribute,
        (nameCounts.get(attribute.nameKa) ?? 0) > 1 ? (categoryNames.get(attribute.categoryId) ?? null) : null,
      ),
    ]),
  );

  return { category, categories, brands, sizes, sharedScale, colors, conditions, attributes, attributeHeaders };
}

function attributeHeader(
  attribute: { nameKa: string; required: boolean; unit: { abbreviationKa: string } | null },
  // Set when another attribute in the template has the same name.
  categoryName: string | null,
) {
  return `${attribute.nameKa}${categoryName ? ` [${categoryName}]` : ""}${attribute.unit ? ` (${attribute.unit.abbreviationKa})` : ""}${attribute.required ? " *" : ""}`;
}

export async function generateProductImportTemplate(categoryId: number): Promise<Buffer> {
  const context = await loadCategoryImportContext(categoryId);
  const { category, categories, brands, sizes, sharedScale, colors, conditions, attributes, attributeHeaders } = context;
  const sizeLabel = sharedScale?.nameKa ?? "ზომა";
  const hasSubcategories = categories.length > 1;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MotoStock 22";
  workbook.created = new Date();

  // ── instructions ──
  const info = workbook.addWorksheet("ინსტრუქცია");
  info.columns = [{ width: 120 }];
  info.addRows([
    [`პროდუქტების ატვირთვის შაბლონი — კატეგორია: ${category.nameKa}`],
    [""],
    [`შეავსეთ „${DATA_SHEET_NAME}“ გვერდი. ერთი რიგი = პროდუქტის ერთი ვარიანტი (მაგ. ერთი ზომა/ფერი).`],
    ["„პროდუქტის №“ აერთიანებს ვარიანტებს: ერთი პროდუქტის ყველა რიგს ერთი და იგივე ნომერი უწერია (1, 1, 1, 2, 2, ...)."],
    [
      hasSubcategories
        ? `„კატეგორია“ — სად დაემატოს პროდუქტი: აირჩიეთ სიიდან (${category.nameKa} ან მისი ქვეკატეგორია). ცარიელი = ${category.nameKa}.`
        : `ყველა პროდუქტი დაემატება კატეგორიაში „${category.nameKa}“ („კატეგორია“ სვეტი შეგიძლიათ ცარიელი დატოვოთ).`,
    ],
    ["კატეგორია, დასახელება, ბრენდი, აღწერა და მახასიათებლები იკითხება პროდუქტის პირველი რიგიდან — დანარჩენ რიგებში შეგიძლიათ ცარიელი დატოვოთ."],
    [`ყოველ რიგს ცალ-ცალკე სჭირდება: ${sizeLabel}, ფერი, ფასი, მარაგი, SKU, FINA ID, მდგომარეობა.`],
    ["* — სავალდებულო ველი. დასახელება (en/ru) თუ ცარიელია, გამოყენებული იქნება ქართული."],
    ["ჩამოსაშლელი სიის მქონე ველებში აირჩიეთ მნიშვნელობა სიიდან (კატეგორია, ბრენდი, ზომა, ფერი, მდგომარეობა, მახასიათებლები, კი/არა)."],
    ["მარაგი ცარიელი = 0. თუ FINA ID მითითებულია, მარაგს შემდეგ FINA განაახლებს. მდგომარეობა ცარიელი = ახალი."],
    ["აღწერაში ახალი ხაზი ახალ აბზაცად გადაიქცევა."],
    ["ფოტოები და მოტოციკლთან თავსებადობა Excel-ით არ იტვირთება — ატვირთვის შემდეგ ემატება ადმინიდან."],
    ["უკვე არსებული პროდუქტი (იგივე კატეგორია + ქართული დასახელება) გამოტოვდება, ამიტომ ფაილის ხელახლა ატვირთვა უსაფრთხოა."],
  ]);
  if (hasSubcategories) {
    // Which category takes which attributes / brands / sizes — the lists
    // in the sheet are the whole subtree's; each product is checked against
    // its own category's.
    info.addRows([
      [""],
      ["ქვეკატეგორიების წესები (მახასიათებლები, ბრენდები და ზომები შემოწმდება პროდუქტის არჩეული კატეგორიის მიხედვით):"],
      ...categories.map((entry) => {
        const own = attributes.filter((attribute) => entry.attributeIds.has(attribute.id)).map((a) => a.nameKa);
        return [`  ${entry.label}: მახასიათებლები — ${own.length > 0 ? own.join(", ") : "არ აქვს"}`];
      }),
      ["  მახასიათებელი, რომელიც პროდუქტის კატეგორიას არ ეხება, ცარიელი დატოვეთ."],
    ]);
  }
  info.addRows([
    [""],
    ["მაგალითი:"],
    ["  1 | ... | Motul 7100 10W-40 | ... | 1 ლ | | 45 | 10 | MOT-7100-1 | ..."],
    ["  1 |     |                   | ... | 4 ლ | | 160 | 5 | MOT-7100-4 | ..."],
    ["  2 | ... | Motul 5100 15W-50 | ... | 1 ლ | | 38 | 8 | MOT-5100-1 | ..."],
  ]);
  info.getRow(1).font = { bold: true, size: 14 };

  // ── data sheet ──
  const data = workbook.addWorksheet(DATA_SHEET_NAME);
  data.columns = [
    ...FIXED_COLUMNS.map((column) => ({
      header: column.key === "size" ? sizeLabel : column.header,
      key: column.key,
      width: column.width,
    })),
    ...attributes.map((attribute) => ({
      header: attributeHeaders.get(attribute.id) ?? attribute.nameKa,
      key: `attr${attribute.id}`,
      width: 20,
    })),
  ];
  const headerRow = data.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 32;
  data.views = [{ state: "frozen", ySplit: 1, xSplit: 3 }];

  // ── dropdown sources (hidden) ──
  const lists = workbook.addWorksheet(LISTS_SHEET_NAME, { state: "hidden" });
  let listColumn = 0;
  const validations = data as WorksheetWithDataValidations;
  function addListValidation(targetColumn: number, values: string[], title: string) {
    if (values.length === 0) return;
    listColumn += 1;
    values.forEach((value, index) => {
      lists.getCell(index + 1, listColumn).value = value;
    });
    const letter = columnLetter(listColumn);
    const target = columnLetter(targetColumn);
    validations.dataValidations.add(`${target}2:${target}${MAX_ROWS}`, {
      type: "list",
      allowBlank: true,
      formulae: [`'${LISTS_SHEET_NAME}'!$${letter}$1:$${letter}$${values.length}`],
      showErrorMessage: true,
      errorTitle: title,
      error: "აირჩიეთ მნიშვნელობა სიიდან.",
    });
  }
  function addNumberValidation(targetColumn: number, title: string, integer = false) {
    const target = columnLetter(targetColumn);
    validations.dataValidations.add(`${target}2:${target}${MAX_ROWS}`, {
      type: integer ? "whole" : "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: title,
      error: "შეიყვანეთ რიცხვი.",
    });
  }

  addListValidation(COLUMN.category, categories.map((entry) => entry.label), "კატეგორია");
  addListValidation(COLUMN.brand, brands.map((brand) => brand.name), "ბრენდი");
  // Names repeat across scales ("M") — listed once; the importer picks the
  // product's category's own scale.
  addListValidation(COLUMN.size, [...new Set(sizes.map((size) => size.nameKa))], sizeLabel);
  addListValidation(COLUMN.color, colors.map((color) => color.nameKa), "ფერი");
  addListValidation(COLUMN.condition, conditions.map((condition) => condition.nameKa), "მდგომარეობა");
  addNumberValidation(COLUMN.price, "ფასი");
  addNumberValidation(COLUMN.stock, "მარაგი", true);
  addNumberValidation(COLUMN.finaId, "FINA ID", true);

  attributes.forEach((attribute, index) => {
    const column = CURRENT_COLUMNS.count + index + 1;
    if (attribute.valueType === "SELECT") {
      addListValidation(column, attribute.options.map((option) => option.labelKa), attribute.nameKa);
    } else if (attribute.valueType === "BOOLEAN") {
      addListValidation(column, [YES, NO], attribute.nameKa);
    } else if (attribute.valueType === "NUMBER") {
      addNumberValidation(column, attribute.nameKa);
    }
  });

  // ── meta (very hidden): category, attribute id per extra column, layout ──
  const meta = workbook.addWorksheet(META_SHEET_NAME, { state: "veryHidden" });
  meta.getCell("A1").value = "categoryId";
  meta.getCell("B1").value = category.id;
  meta.getCell("A2").value = "attributeIds";
  attributes.forEach((attribute, index) => {
    meta.getCell(2, index + 2).value = attribute.id;
  });
  meta.getCell("A3").value = "layout";
  meta.getCell("B3").value = CURRENT_LAYOUT;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
