import ExcelJS from "exceljs";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { createProduct, deleteProduct } from "./products.service.js";
import { createProductVariant } from "../product-variants/product-variants.service.js";
import type { ProductAttributeValueInput } from "./products.schema.js";
import {
  DATA_SHEET_NAME,
  FIXED_COLUMNS,
  FIXED_COLUMN_INDEX,
  META_SHEET_NAME,
  NO,
  YES,
  loadCategoryImportContext,
} from "./products-import-template.service.js";

// Imports a filled products-import-template.service.ts workbook: rows with
// the same "პროდუქტის №" become one product with one variant per row.
// Everything is validated up front; then each product is created with its
// variants (and removed again if a variant fails), so a product is never
// left half-imported. Products whose Georgian name already exists in the
// category are skipped, which makes re-uploading the same file safe.

const MAX_DATA_ROWS = 2000;

type RowResult = {
  row: number;
  status: "created" | "skipped" | "error";
  message: string | null;
  productId: number | null;
};

function cellText(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  if (value == null || value === "") return undefined;
  if (typeof value === "object") {
    if ("richText" in value) return (value as { richText: { text: string }[] }).richText.map((p) => p.text).join("").trim() || undefined;
    if ("result" in value) return String((value as { result: unknown }).result ?? "").trim() || undefined;
    if ("text" in value) return String((value as { text: unknown }).text ?? "").trim() || undefined;
  }
  return String(value).trim() || undefined;
}

function cellNumber(cell: ExcelJS.Cell): number | undefined | null {
  const text = cellText(cell);
  if (text === undefined) return undefined;
  const num = Number(text.replace(",", "."));
  return Number.isFinite(num) ? num : null; // null = present but not a number
}

const norm = (value: string) => value.trim().toLowerCase();

function parseBoolean(text: string): boolean | null {
  const value = norm(text);
  if ([norm(YES), "true", "yes", "1", "да"].includes(value)) return true;
  if ([norm(NO), "false", "no", "0", "нет"].includes(value)) return false;
  return null;
}

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t", ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n",
  ო: "o", პ: "p", ჟ: "zh", რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "p", ქ: "k", ღ: "gh", ყ: "q", შ: "sh", ჩ: "ch",
  ც: "ts", ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh", ჯ: "j", ჰ: "h",
};

function slugify(value: string): string {
  return [...value.toLowerCase()]
    .map((char) => GEORGIAN_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function uniqueSlug(base: string, taken: Set<string>): Promise<string> {
  const root = base || "product";
  for (let suffix = 1; ; suffix++) {
    const candidate = suffix === 1 ? root : `${root}-${suffix}`;
    if (taken.has(candidate)) continue;
    if (!(await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }))) {
      taken.add(candidate);
      return candidate;
    }
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain-text cell → the rich-text HTML product descriptions are stored as.
function toParagraphs(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

type ParsedVariant = {
  row: number;
  sizeId: number | null;
  colorId: number | null;
  price: number;
  stockQuantity: number;
  sku: string | null;
  finaId: number | null;
  conditionId: number;
};

type ParsedProduct = {
  group: string;
  rows: number[];
  nameKa: string;
  nameEn: string;
  nameRu: string;
  productBrandId: number | null;
  descriptionKa?: string;
  descriptionEn?: string;
  descriptionRu?: string;
  attributeValues: ProductAttributeValueInput[];
  variants: ParsedVariant[];
  errors: Map<number, string[]>;
};

export async function bulkImportProducts(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ApiError(400, "ფაილი ვერ წაიკითხა — ატვირთეთ .xlsx ფორმატის შაბლონი");
  }
  const sheet = workbook.getWorksheet(DATA_SHEET_NAME);
  const meta = workbook.getWorksheet(META_SHEET_NAME);
  if (!sheet || !meta) {
    throw new ApiError(400, "ეს ფაილი პროდუქტების შაბლონი არ არის — გადმოწერეთ შაბლონი ადმინიდან");
  }

  const categoryId = cellNumber(meta.getCell("B1"));
  if (!categoryId) throw new ApiError(400, "შაბლონში კატეგორია ვერ მოიძებნა");
  const context = await loadCategoryImportContext(categoryId);

  // Extra columns → attributes, as the template recorded them.
  const attributeById = new Map(context.attributes.map((attribute) => [attribute.id, attribute]));
  const attributeColumns: { column: number; attribute: (typeof context.attributes)[number] }[] = [];
  for (let index = 0; ; index++) {
    const id = cellNumber(meta.getCell(2, index + 2));
    if (!id) break;
    const attribute = attributeById.get(id);
    if (attribute) attributeColumns.push({ column: FIXED_COLUMNS.length + index + 1, attribute });
  }
  const missingRequired = context.attributes.filter(
    (attribute) => attribute.required && !attributeColumns.some((entry) => entry.attribute.id === attribute.id),
  );

  const byName = <T>(items: T[], name: (item: T) => string) => new Map(items.map((item) => [norm(name(item)), item]));
  const brands = byName(context.brands, (brand) => brand.name);
  const sizes = byName(context.sizes, (size) => size.nameKa);
  const colors = byName(context.colors, (color) => color.nameKa);
  const conditions = byName(context.conditions, (condition) => condition.nameKa);
  const defaultCondition = context.conditions.find((condition) => condition.key === "NEW") ?? context.conditions[0];
  const availableStatus = await prisma.listingStatus.findUnique({ where: { key: "AVAILABLE" } });

  // ── parse ──
  const products = new Map<string, ParsedProduct>();
  const order: string[] = [];
  const results: RowResult[] = [];
  const lastRow = Math.min(sheet.rowCount, MAX_DATA_ROWS + 1);
  if (sheet.rowCount > MAX_DATA_ROWS + 1) {
    throw new ApiError(400, `ერთ ფაილში მაქსიმუმ ${MAX_DATA_ROWS} რიგია დასაშვები`);
  }

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const cell = (key: keyof typeof FIXED_COLUMN_INDEX) => row.getCell(FIXED_COLUMN_INDEX[key]);
    const totalColumns = FIXED_COLUMNS.length + attributeColumns.length;
    let empty = true;
    for (let column = 1; column <= totalColumns; column++) {
      if (cellText(row.getCell(column)) !== undefined) {
        empty = false;
        break;
      }
    }
    if (empty) continue;

    const errors: string[] = [];
    const group = cellText(cell("group"));
    if (!group) {
      results.push({ row: rowNumber, status: "error", message: "„პროდუქტის №“ ცარიელია", productId: null });
      continue;
    }

    let product = products.get(group);
    if (!product) {
      // Product-level fields come from the group's first row.
      const nameKa = cellText(cell("nameKa")) ?? "";
      if (!nameKa) errors.push("დასახელება (ka) სავალდებულოა");
      if (missingRequired.length > 0) {
        errors.push(`შაბლონს აკლია სავალდებულო მახასიათებელი: ${missingRequired.map((a) => a.nameKa).join(", ")} — გადმოწერეთ ახალი შაბლონი`);
      }
      const brandText = cellText(cell("brand"));
      const brand = brandText ? brands.get(norm(brandText)) : undefined;
      if (brandText && !brand) errors.push(`უცნობი ბრენდი: ${brandText}`);

      const attributeValues: ProductAttributeValueInput[] = [];
      for (const { column, attribute } of attributeColumns) {
        const text = cellText(row.getCell(column));
        if (text === undefined) {
          if (attribute.required) errors.push(`„${attribute.nameKa}“ სავალდებულოა`);
          continue;
        }
        if (attribute.valueType === "SELECT") {
          const option = attribute.options.find((item) => norm(item.labelKa) === norm(text) || norm(item.key) === norm(text));
          if (option) attributeValues.push({ attributeId: attribute.id, optionId: option.id });
          else errors.push(`„${attribute.nameKa}“: უცნობი მნიშვნელობა „${text}“`);
        } else if (attribute.valueType === "BOOLEAN") {
          const value = parseBoolean(text);
          if (value != null) attributeValues.push({ attributeId: attribute.id, valueBoolean: value });
          else errors.push(`„${attribute.nameKa}“: მიუთითეთ ${YES} ან ${NO}`);
        } else if (attribute.valueType === "NUMBER") {
          const value = Number(text.replace(",", "."));
          if (Number.isFinite(value)) attributeValues.push({ attributeId: attribute.id, valueNumber: value });
          else errors.push(`„${attribute.nameKa}“: რიცხვი უნდა იყოს`);
        } else {
          attributeValues.push({ attributeId: attribute.id, valueText: text.slice(0, 2000) });
        }
      }

      product = {
        group,
        rows: [],
        nameKa,
        nameEn: cellText(cell("nameEn")) ?? nameKa,
        nameRu: cellText(cell("nameRu")) ?? nameKa,
        productBrandId: brand?.id ?? null,
        descriptionKa: toParagraphs(cellText(cell("descriptionKa"))),
        descriptionEn: toParagraphs(cellText(cell("descriptionEn"))),
        descriptionRu: toParagraphs(cellText(cell("descriptionRu"))),
        attributeValues,
        variants: [],
        errors: new Map(),
      };
      products.set(group, product);
      order.push(group);
    }
    product.rows.push(rowNumber);

    // Variant fields — every row.
    const sizeText = cellText(cell("size"));
    const size = sizeText ? sizes.get(norm(sizeText)) : undefined;
    if (sizeText && !size) errors.push(`უცნობი ზომა: ${sizeText}`);
    const colorText = cellText(cell("color"));
    const color = colorText ? colors.get(norm(colorText)) : undefined;
    if (colorText && !color) errors.push(`უცნობი ფერი: ${colorText}`);
    const conditionText = cellText(cell("condition"));
    const condition = conditionText ? conditions.get(norm(conditionText)) : defaultCondition;
    if (conditionText && !condition) errors.push(`უცნობი მდგომარეობა: ${conditionText}`);
    const price = cellNumber(cell("price"));
    if (price == null || price <= 0) errors.push("ფასი სავალდებულოა და 0-ზე მეტი უნდა იყოს");
    const stock = cellNumber(cell("stock"));
    if (stock === null || (stock != null && (stock < 0 || !Number.isInteger(stock)))) errors.push("მარაგი მთელი, არაუარყოფითი რიცხვი უნდა იყოს");
    const finaId = cellNumber(cell("finaId"));
    if (finaId === null || (finaId != null && (finaId <= 0 || !Number.isInteger(finaId)))) errors.push("FINA ID მთელი დადებითი რიცხვი უნდა იყოს");
    const sku = cellText(cell("sku"))?.slice(0, 100) ?? null;

    if (errors.length > 0) product.errors.set(rowNumber, errors);
    product.variants.push({
      row: rowNumber,
      sizeId: size?.id ?? null,
      colorId: color?.id ?? null,
      price: price ?? 0,
      stockQuantity: stock ?? 0,
      sku,
      finaId: finaId ?? null,
      conditionId: condition?.id ?? defaultCondition.id,
    });
  }

  // ── cross-row checks ──
  const skuRows = new Map<string, number>();
  const finaRows = new Map<number, number>();
  for (const group of order) {
    const product = products.get(group)!;
    const combos = new Set<string>();
    for (const variant of product.variants) {
      const add = (message: string) => product.errors.set(variant.row, [...(product.errors.get(variant.row) ?? []), message]);
      const combo = `${variant.sizeId ?? "-"}|${variant.colorId ?? "-"}`;
      if (combos.has(combo)) add("ამ პროდუქტს ეს ზომა/ფერი უკვე აქვს სხვა რიგში");
      combos.add(combo);
      if (variant.sku) {
        if (skuRows.has(variant.sku)) add(`SKU „${variant.sku}“ მეორდება (რიგი ${skuRows.get(variant.sku)})`);
        else skuRows.set(variant.sku, variant.row);
      }
      if (variant.finaId != null) {
        if (finaRows.has(variant.finaId)) add(`FINA ID ${variant.finaId} მეორდება (რიგი ${finaRows.get(variant.finaId)})`);
        else finaRows.set(variant.finaId, variant.row);
      }
    }
  }
  // Already in the category (same Georgian name) — skipped, not an error, so
  // re-uploading a file only adds what's new.
  // A same-named product WITHOUT variants is left over from an interrupted
  // earlier import (or an unfinished admin entry) — it's invisible on the
  // site, so silently skipping it would lose the product; reported as an
  // error instead, for the admin to finish or delete it, then re-upload.
  const existingRows = await prisma.product.findMany({
    where: { categoryId },
    select: { nameKa: true, _count: { select: { variants: true } } },
  });
  const existingNames = new Set(existingRows.filter((row) => row._count.variants > 0).map((row) => norm(row.nameKa)));
  const emptyNames = new Set(existingRows.filter((row) => row._count.variants === 0).map((row) => norm(row.nameKa)));
  const isExisting = (product: ParsedProduct) => product.nameKa !== "" && existingNames.has(norm(product.nameKa));
  for (const group of order) {
    const product = products.get(group)!;
    if (product.nameKa === "" || !emptyNames.has(norm(product.nameKa))) continue;
    product.errors.set(product.rows[0], [
      ...(product.errors.get(product.rows[0]) ?? []),
      "ამ სახელით პროდუქტი უკვე არსებობს, მაგრამ ვარიანტების გარეშე (შეწყვეტილი ატვირთვა?) — დაასრულეთ ან წაშალეთ ის ადმინიდან და ატვირთეთ თავიდან",
    ]);
  }

  const [takenSkus, takenFinaIds] = await Promise.all([
    skuRows.size > 0
      ? prisma.productVariant.findMany({ where: { sku: { in: [...skuRows.keys()] } }, select: { sku: true } })
      : [],
    finaRows.size > 0
      ? prisma.productVariant.findMany({ where: { finaId: { in: [...finaRows.keys()] } }, select: { finaId: true } })
      : [],
  ]);
  const takenSkuSet = new Set(takenSkus.map((row) => row.sku));
  const takenFinaSet = new Set(takenFinaIds.map((row) => row.finaId));
  for (const group of order) {
    const product = products.get(group)!;
    if (isExisting(product)) continue;
    for (const variant of product.variants) {
      const add = (message: string) => product.errors.set(variant.row, [...(product.errors.get(variant.row) ?? []), message]);
      if (variant.sku && takenSkuSet.has(variant.sku)) add(`SKU „${variant.sku}“ უკვე გამოყენებულია საიტზე`);
      if (variant.finaId != null && takenFinaSet.has(variant.finaId)) add(`FINA ID ${variant.finaId} უკვე მიბმულია სხვა ვარიანტზე`);
    }
  }

  // ── write ──
  const takenSlugs = new Set<string>();
  let createdProducts = 0;
  let createdVariants = 0;

  for (const group of order) {
    const product = products.get(group)!;
    if (isExisting(product)) {
      for (const row of product.rows) {
        results.push({ row, status: "skipped", message: "ასეთი პროდუქტი ამ კატეგორიაში უკვე არსებობს", productId: null });
      }
      continue;
    }
    if (product.errors.size > 0) {
      for (const row of product.rows) {
        const own = product.errors.get(row);
        results.push({
          row,
          status: "error",
          message: own ? own.join("; ") : `პროდუქტი №${group} არ აიტვირთა — შეცდომაა მის სხვა რიგში`,
          productId: null,
        });
      }
      continue;
    }
    let createdId: number | null = null;
    try {
      const created = await createProduct({
        categoryId,
        productBrandId: product.productBrandId,
        name: { ka: product.nameKa, en: product.nameEn, ru: product.nameRu },
        slug: await uniqueSlug(slugify(product.nameEn) || slugify(product.nameKa), takenSlugs),
        descriptionKa: product.descriptionKa,
        descriptionEn: product.descriptionEn,
        descriptionRu: product.descriptionRu,
        attributeValues: product.attributeValues,
      });
      createdId = created.id;
      for (const variant of product.variants) {
        await createProductVariant({
          productId: created.id,
          sizeId: variant.sizeId,
          colorId: variant.colorId,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          sku: variant.sku,
          finaId: variant.finaId,
          conditionId: variant.conditionId,
          statusId: availableStatus?.id ?? null,
          isActive: true,
        });
      }
      existingNames.add(norm(product.nameKa));
      createdProducts += 1;
      createdVariants += product.variants.length;
      for (const row of product.rows) results.push({ row, status: "created", message: null, productId: created.id });
    } catch (error) {
      if (createdId != null) await deleteProduct(createdId).catch(() => undefined);
      const message = error instanceof ApiError ? error.message : "უცნობი შეცდომა";
      for (const row of product.rows) results.push({ row, status: "error", message, productId: null });
    }
  }

  results.sort((a, b) => a.row - b.row);
  return {
    categoryName: context.category.nameKa,
    totalRows: results.length,
    createdProducts,
    createdVariants,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    errorCount: results.filter((result) => result.status === "error").length,
    results,
  };
}
