import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveSizeScale } from "../categories/categories.service.js";
import { resolveAttributeCategoryIds, resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { listProductBrands } from "../product-brands/product-brands.service.js";

// Excel template for bulk-creating one category's products (see
// products-bulk-import.service.ts). Per category, because each category has
// its own attributes — they become extra columns after FIXED_COLUMNS. Every
// pick-from-a-list value (brand, size, color, condition, SELECT attributes,
// yes/no) is a dropdown of human-readable names, so the shop staff filling
// it never deal with ids; the importer maps the names back. A hidden _meta
// sheet records the category and which attribute each extra column is.

export const DATA_SHEET_NAME = "პროდუქტები";
export const META_SHEET_NAME = "_meta";
const LISTS_SHEET_NAME = "სიები";
const MAX_ROWS = 2000;

export const YES = "კი";
export const NO = "არა";

// Positional (1-based) — the importer reads by position, not header text.
export const FIXED_COLUMNS = [
  { key: "group", header: "პროდუქტის № *", width: 14 },
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
export const FIXED_COLUMN_INDEX = Object.fromEntries(
  FIXED_COLUMNS.map((column, index) => [column.key, index + 1]),
) as Record<FixedColumnKey, number>;

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

// What the template (and the importer) need to know about a category.
export async function loadCategoryImportContext(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) throw new ApiError(404, "კატეგორია ვერ მოიძებნა");

  const ancestors = await resolveCategoryAndAncestorIds(categoryId);
  const root = await categoriesRepository.findById(ancestors[ancestors.length - 1]);
  if (root?.slug === "transport") {
    throw new ApiError(400, "ტექნიკა პროდუქტად არ იტვირთება — გამოიყენეთ ტექნიკის კატალოგი/განცხადებები");
  }

  const [attributeCategoryIds, brandsPage, sizeScale, colors, conditions] = await Promise.all([
    resolveAttributeCategoryIds(categoryId),
    listProductBrands({ categoryId }),
    resolveSizeScale(categoryId),
    prisma.color.findMany({ orderBy: { nameKa: "asc" } }),
    prisma.condition.findMany({ orderBy: { id: "asc" } }),
  ]);
  const [attributes, sizes] = await Promise.all([
    prisma.attribute.findMany({
      where: { categoryId: { in: attributeCategoryIds } },
      include: {
        options: { orderBy: { id: "asc" } },
        unit: { select: { abbreviationKa: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.size.findMany({ where: sizeScale ? { scaleId: sizeScale.id } : undefined, orderBy: { id: "asc" } }),
  ]);

  return { category, brands: brandsPage.items, sizeScale, sizes, colors, conditions, attributes };
}

function attributeHeader(attribute: { nameKa: string; required: boolean; unit: { abbreviationKa: string } | null }) {
  return `${attribute.nameKa}${attribute.unit ? ` (${attribute.unit.abbreviationKa})` : ""}${attribute.required ? " *" : ""}`;
}

export async function generateProductImportTemplate(categoryId: number): Promise<Buffer> {
  const context = await loadCategoryImportContext(categoryId);
  const { category, brands, sizeScale, sizes, colors, conditions, attributes } = context;
  const sizeLabel = sizeScale?.nameKa ?? "ზომა";

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
    ["დასახელება, ბრენდი, აღწერა და მახასიათებლები იკითხება პროდუქტის პირველი რიგიდან — დანარჩენ რიგებში შეგიძლიათ ცარიელი დატოვოთ."],
    [`ყოველ რიგს ცალ-ცალკე სჭირდება: ${sizeLabel}, ფერი, ფასი, მარაგი, SKU, FINA ID, მდგომარეობა.`],
    ["* — სავალდებულო ველი. დასახელება (en/ru) თუ ცარიელია, გამოყენებული იქნება ქართული."],
    ["ჩამოსაშლელი სიის მქონე ველებში აირჩიეთ მნიშვნელობა სიიდან (ბრენდი, ზომა, ფერი, მდგომარეობა, მახასიათებლები, კი/არა)."],
    ["მარაგი ცარიელი = 0. თუ FINA ID მითითებულია, მარაგს შემდეგ FINA განაახლებს. მდგომარეობა ცარიელი = ახალი."],
    ["აღწერაში ახალი ხაზი ახალ აბზაცად გადაიქცევა."],
    ["ფოტოები და მოტოციკლთან თავსებადობა Excel-ით არ იტვირთება — ატვირთვის შემდეგ ემატება ადმინიდან."],
    ["უკვე არსებული პროდუქტი (იგივე კატეგორია + ქართული დასახელება) გამოტოვდება, ამიტომ ფაილის ხელახლა ატვირთვა უსაფრთხოა."],
    [""],
    ["მაგალითი:"],
    ["  1 | Motul 7100 10W-40 | ... | 1 ლ | | 45 | 10 | MOT-7100-1 | ..."],
    ["  1 |                   | ... | 4 ლ | | 160 | 5 | MOT-7100-4 | ..."],
    ["  2 | Motul 5100 15W-50 | ... | 1 ლ | | 38 | 8 | MOT-5100-1 | ..."],
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
    ...attributes.map((attribute) => ({ header: attributeHeader(attribute), key: `attr${attribute.id}`, width: 20 })),
  ];
  const headerRow = data.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 32;
  data.views = [{ state: "frozen", ySplit: 1, xSplit: 2 }];

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

  addListValidation(FIXED_COLUMN_INDEX.brand, brands.map((brand) => brand.name), "ბრენდი");
  addListValidation(FIXED_COLUMN_INDEX.size, sizes.map((size) => size.nameKa), sizeLabel);
  addListValidation(FIXED_COLUMN_INDEX.color, colors.map((color) => color.nameKa), "ფერი");
  addListValidation(FIXED_COLUMN_INDEX.condition, conditions.map((condition) => condition.nameKa), "მდგომარეობა");
  addNumberValidation(FIXED_COLUMN_INDEX.price, "ფასი");
  addNumberValidation(FIXED_COLUMN_INDEX.stock, "მარაგი", true);
  addNumberValidation(FIXED_COLUMN_INDEX.finaId, "FINA ID", true);

  attributes.forEach((attribute, index) => {
    const column = FIXED_COLUMNS.length + index + 1;
    if (attribute.valueType === "SELECT") {
      addListValidation(column, attribute.options.map((option) => option.labelKa), attribute.nameKa);
    } else if (attribute.valueType === "BOOLEAN") {
      addListValidation(column, [YES, NO], attribute.nameKa);
    } else if (attribute.valueType === "NUMBER") {
      addNumberValidation(column, attribute.nameKa);
    }
  });

  // ── meta (very hidden): category + attribute id per extra column ──
  const meta = workbook.addWorksheet(META_SHEET_NAME, { state: "veryHidden" });
  meta.getCell("A1").value = "categoryId";
  meta.getCell("B1").value = category.id;
  meta.getCell("A2").value = "attributeIds";
  attributes.forEach((attribute, index) => {
    meta.getCell(2, index + 2).value = attribute.id;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
