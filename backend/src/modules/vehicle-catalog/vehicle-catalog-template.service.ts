import ExcelJS from "exceljs";
import { brandsRepository } from "../brands/brands.repository.js";
import { modelsRepository } from "../models/models.repository.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate, type LookupType } from "../lookups/lookups.registry.js";

// The 7 spec-lookup types VehicleCatalog actually references (see
// vehicle-catalog.prisma) — a subset of the full LOOKUP_TYPES registry,
// which also covers unrelated things (colors, sizes, cities, ...). Each
// becomes its own reference sheet in the generated template, named to match
// the data-entry column it backs.
const SPEC_LOOKUPS: { type: LookupType; sheetName: string; columnKey: string }[] = [
  { type: "fuel-types", sheetName: "საწვავის ტიპი", columnKey: "fuelTypeId" },
  { type: "transmission-types", sheetName: "გადაცემათა კოლოფი", columnKey: "transmissionTypeId" },
  { type: "cooling-types", sheetName: "გაგრილების ტიპი", columnKey: "coolingTypeId" },
  { type: "final-drive-types", sheetName: "საბოლოო გადაცემა", columnKey: "finalDriveTypeId" },
  { type: "drive-types", sheetName: "წამყვანი თვლები", columnKey: "driveTypeId" },
  { type: "start-types", sheetName: "გაშვების სისტემა", columnKey: "startTypeId" },
  { type: "powertrain-types", sheetName: "ძრავის ტიპი", columnKey: "powertrainTypeId" },
];

// Column order here is the single source of truth shared with
// vehicle-catalog-bulk-import.service.ts's COLUMN_INDEX map — the two must
// stay in sync, since the importer reads uploaded files positionally
// (column A = brandId, B = modelId, ...) rather than by header text, so a
// re-uploaded template always parses correctly regardless of header
// wording changes.
export const DATA_COLUMNS: { key: string; header: string }[] = [
  { key: "brandId", header: "brandId (მარკის ID) *" },
  { key: "modelId", header: "modelId (მოდელის ID) *" },
  { key: "variant", header: "ვარიანტი" },
  { key: "yearFrom", header: "წელი (დან)" },
  { key: "yearTo", header: "წელი (მდე)" },
  { key: "engineVolumeCc", header: "ძრავის მოცულობა (cc)" },
  { key: "enginePowerHp", header: "სიმძლავრე (ც.ძ.)" },
  { key: "cylinderCount", header: "ცილინდრების რაოდენობა" },
  { key: "gearCount", header: "გადაცემების რაოდენობა" },
  { key: "seatCount", header: "ადგილების რაოდენობა" },
  { key: "weightKg", header: "წონა (კგ)" },
  { key: "seatHeightMm", header: "სავარძლის სიმაღლე (მმ)" },
  { key: "fuelTankLiters", header: "საწვავის ბაკი (ლ)" },
  { key: "topSpeedKmh", header: "მაქს. სიჩქარე (კმ/სთ)" },
  { key: "hasAbs", header: "ABS (TRUE/FALSE)" },
  { key: "fuelTypeId", header: "fuelTypeId (საწვავის ტიპი)" },
  { key: "transmissionTypeId", header: "transmissionTypeId (გადაცემათა კოლოფი)" },
  { key: "coolingTypeId", header: "coolingTypeId (გაგრილების ტიპი)" },
  { key: "finalDriveTypeId", header: "finalDriveTypeId (საბოლოო გადაცემა)" },
  { key: "driveTypeId", header: "driveTypeId (წამყვანი თვლები)" },
  { key: "startTypeId", header: "startTypeId (გაშვების სისტემა)" },
  { key: "powertrainTypeId", header: "powertrainTypeId (ძრავის ტიპი)" },
  { key: "motorPowerWatt", header: "ელ. ძრავის სიმძლავრე (W)" },
  { key: "batteryCapacityWh", header: "ბატარეის ტევადობა (Wh)" },
  { key: "rangeKm", header: "გარბენი (კმ)" },
  { key: "chargingTimeMinutes", header: "დატენვის დრო (წთ)" },
  { key: "hasLockingDifferential", header: "დიფ. საკეტი (TRUE/FALSE)" },
  { key: "descriptionKa", header: "აღწერა (ka)" },
  { key: "descriptionEn", header: "აღწერა (en)" },
  { key: "descriptionRu", header: "აღწერა (ru)" },
];

const DATA_SHEET_NAME = "მონაცემები";
const REF_ROW_LIMIT = 2000;

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

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle", wrapText: true };
}

// exceljs's shipped .d.ts omits Worksheet.dataValidations (a range-based API
// that exists at runtime — lib/doc/worksheet.js — but predates this version's
// type declarations, which only model the older per-cell Cell.dataValidation
// property). This narrow interface fills just that gap.
interface WorksheetWithDataValidations extends ExcelJS.Worksheet {
  dataValidations: {
    add(range: string, validation: ExcelJS.DataValidation): void;
  };
}

export async function generateVehicleCatalogTemplate(): Promise<Buffer> {
  const [brands, models, lookupLists] = await Promise.all([
    brandsRepository.findMany(),
    modelsRepository.findMany(),
    Promise.all(SPEC_LOOKUPS.map((entry) => lookupsRepository.findMany(getLookupDelegate(entry.type)))),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MotoStock 22";
  workbook.created = new Date();

  const infoSheet = workbook.addWorksheet("ინსტრუქცია");
  infoSheet.columns = [{ width: 110 }];
  infoSheet.addRows([
    ["ტექნიკის კატალოგის მასობრივი ატვირთვის შაბლონი"],
    [""],
    [`შეავსეთ "${DATA_SHEET_NAME}" გვერდი — თითო რიგი ერთი ტექნიკის ჩანაწერია.`],
    ['brandId და modelId სავალდებულოა — იხილეთ ID "მარკები" და "მოდელები" გვერდებზე.'],
    ['დარწმუნდით, რომ არჩეული მოდელი ეკუთვნის არჩეულ მარკას — "მოდელები" გვერდზე ეს ჩანს brandId სვეტში.'],
    ["დანარჩენი ID ველები (fuelTypeId, transmissionTypeId და ა.შ.) არასავალდებულოა — შესაბამისი კლასიფიკატორის გვერდზე ჩანს ID."],
    ["ცარიელი უჯრა ნიშნავს, რომ მნიშვნელობა არ არის მითითებული."],
    ["TRUE/FALSE ველებში მიუთითეთ ზუსტად ეს სიტყვები ან დატოვეთ ცარიელი."],
    ["ID სვეტებზე დაწკაპუნებისას ჩნდება ჩამოსაშლელი სია — შეგიძლიათ პირდაპირ იქიდან აირჩიოთ."],
  ]);
  infoSheet.getRow(1).font = { bold: true, size: 14 };

  const dataSheet = workbook.addWorksheet(DATA_SHEET_NAME);
  dataSheet.columns = DATA_COLUMNS.map((col) => ({ header: col.header, key: col.key, width: 24 }));
  styleHeaderRow(dataSheet);
  dataSheet.views = [{ state: "frozen", ySplit: 1 }];

  const brandsSheet = workbook.addWorksheet("მარკები");
  brandsSheet.columns = [
    { header: "id", key: "id", width: 8 },
    { header: "დასახელება (ka)", key: "nameKa", width: 26 },
    { header: "დასახელება (en)", key: "nameEn", width: 26 },
    { header: "slug", key: "slug", width: 22 },
  ];
  styleHeaderRow(brandsSheet);
  for (const brand of brands) {
    brandsSheet.addRow({ id: brand.id, nameKa: brand.nameKa, nameEn: brand.nameEn, slug: brand.slug });
  }

  const modelsSheet = workbook.addWorksheet("მოდელები");
  modelsSheet.columns = [
    { header: "id", key: "id", width: 8 },
    { header: "brandId", key: "brandId", width: 10 },
    { header: "მარკა", key: "brandName", width: 22 },
    { header: "კატეგორია", key: "categoryName", width: 22 },
    { header: "დასახელება (ka)", key: "nameKa", width: 26 },
    { header: "slug", key: "slug", width: 22 },
  ];
  styleHeaderRow(modelsSheet);
  for (const model of models) {
    modelsSheet.addRow({
      id: model.id,
      brandId: model.brandId,
      brandName: model.brand.nameKa,
      categoryName: model.category.nameKa,
      nameKa: model.nameKa,
      slug: model.slug,
    });
  }

  const idColumnSheetMap: Record<string, string> = { brandId: "მარკები", modelId: "მოდელები" };

  SPEC_LOOKUPS.forEach((entry, index) => {
    const sheet = workbook.addWorksheet(entry.sheetName);
    sheet.columns = [
      { header: "id", key: "id", width: 8 },
      { header: "დასახელება (ka)", key: "nameKa", width: 26 },
      { header: "დასახელება (en)", key: "nameEn", width: 26 },
    ];
    styleHeaderRow(sheet);
    for (const item of lookupLists[index]) {
      sheet.addRow({ id: item.id, nameKa: item.nameKa, nameEn: item.nameEn });
    }
    idColumnSheetMap[entry.columnKey] = entry.sheetName;
  });

  // List-type data validation on every ID column, pointing at the matching
  // reference sheet's id column — lets the admin pick from a dropdown
  // instead of only cross-referencing by eye. allowBlank since every one of
  // these except brandId/modelId is optional.
  DATA_COLUMNS.forEach((col, index) => {
    const sheetName = idColumnSheetMap[col.key];
    if (!sheetName) return;

    const letter = columnLetter(index + 1);
    (dataSheet as WorksheetWithDataValidations).dataValidations.add(`${letter}2:${letter}${REF_ROW_LIMIT}`, {
      type: "list",
      allowBlank: true,
      formulae: [`'${sheetName}'!$A$2:$A$${REF_ROW_LIMIT}`],
      showErrorMessage: true,
      errorTitle: "არასწორი ID",
      error: `აირჩიეთ მნიშვნელობა სიიდან, ან შეამოწმეთ ID "${sheetName}" გვერდზე.`,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
