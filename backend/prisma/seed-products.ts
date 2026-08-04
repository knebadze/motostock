import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { SITE_NAME } from "../src/config/site.js";

// Demo product catalog covering every leaf product category, exercising the
// full breadth of the product-adding feature: category-inherited attributes
// (SELECT/NUMBER/BOOLEAN/TEXT, required and optional), single- and
// multi-variant (size x color matrix) products, a discount, and a
// vehicle-fitment (compatibility) link. Run separately from the main seed
// (`npx tsx prisma/seed-products.ts`) since it's demo/sample content, not
// baseline reference data. Safe to re-run — each product is upserted by
// slug and children are only created the first time.

async function categoryId(slug: string): Promise<number> {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) throw new Error(`Unknown category slug: ${slug}`);
  return category.id;
}

async function brandId(slug: string): Promise<number> {
  const brand = await prisma.productBrand.findUnique({ where: { slug } });
  if (!brand) throw new Error(`Unknown product brand slug: ${slug}`);
  return brand.id;
}

async function attributeId(definingCategorySlug: string, nameKa: string): Promise<number> {
  const catId = await categoryId(definingCategorySlug);
  const attribute = await prisma.attribute.findFirst({ where: { categoryId: catId, nameKa } });
  if (!attribute) throw new Error(`Unknown attribute "${nameKa}" on category ${definingCategorySlug}`);
  return attribute.id;
}

async function optionId(definingCategorySlug: string, nameKa: string, key: string): Promise<number> {
  const attrId = await attributeId(definingCategorySlug, nameKa);
  const option = await prisma.attributeOption.findUnique({
    where: { attributeId_key: { attributeId: attrId, key } },
  });
  if (!option) throw new Error(`Unknown option "${key}" for attribute "${nameKa}"`);
  return option.id;
}

async function lookupId(
  delegate: { findUnique: (args: { where: { key: string } }) => Promise<{ id: number } | null> },
  key: string,
): Promise<number> {
  const row = await delegate.findUnique({ where: { key } });
  if (!row) throw new Error(`Unknown lookup key: ${key}`);
  return row.id;
}

type SelectAttrValue = { kind: "select"; definingCategorySlug: string; nameKa: string; optionKey: string };
type NumberAttrValue = { kind: "number"; definingCategorySlug: string; nameKa: string; value: number };
type BooleanAttrValue = { kind: "boolean"; definingCategorySlug: string; nameKa: string; value: boolean };
type TextAttrValue = { kind: "text"; definingCategorySlug: string; nameKa: string; value: string };
type AttrValueSeed = SelectAttrValue | NumberAttrValue | BooleanAttrValue | TextAttrValue;

type VariantSeed = {
  sizeKey?: string;
  colorKey?: string;
  price: number;
  stockQuantity: number;
  sku: string;
};

type ProductSeed = {
  categorySlug: string;
  brandSlug?: string;
  slug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa: string;
  descriptionEn: string;
  descriptionRu: string;
  attributes: AttrValueSeed[];
  variants: VariantSeed[];
  discountPercent?: number;
  discountDays?: number;
  fitmentVehicleSlug?: string;
};

const PRODUCTS: ProductSeed[] = [
  // --- gear (inherits Material / Season / Waterproof) ---
  {
    categorySlug: "jackets",
    brandSlug: "alpinestars",
    slug: "motorcycle-jacket-alpinestars",
    nameKa: "სამოტოციკლო ქურთუკი",
    nameEn: "Motorcycle Jacket",
    nameRu: "Мотокуртка",
    descriptionKa: "<p>ტყავის სამოტოციკლო ქურთუკი მოცილებადი დამცავებით.</p>",
    descriptionEn: "<p>Leather motorcycle jacket with removable armor.</p>",
    descriptionRu: "<p>Кожаная мотокуртка со съёмной защитой.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "LEATHER" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
      { kind: "select", definingCategorySlug: "jackets", nameKa: "დამცავის CE დონე", optionKey: "CE2" },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 450, stockQuantity: 5, sku: "JAC-ALP-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 450, stockQuantity: 4, sku: "JAC-ALP-L-BLK" },
      { sizeKey: "XL", colorKey: "BLACK", price: 450, stockQuantity: 3, sku: "JAC-ALP-XL-BLK" },
      { sizeKey: "M", colorKey: "RED", price: 460, stockQuantity: 2, sku: "JAC-ALP-M-RED" },
      { sizeKey: "L", colorKey: "RED", price: 460, stockQuantity: 2, sku: "JAC-ALP-L-RED" },
      { sizeKey: "XL", colorKey: "RED", price: 460, stockQuantity: 1, sku: "JAC-ALP-XL-RED" },
    ],
    discountPercent: 15,
    discountDays: 30,
  },
  {
    categorySlug: "gloves",
    brandSlug: "revit",
    slug: "leather-gloves-revit",
    nameKa: "ტყავის ხელთათმანები",
    nameEn: "Leather Gloves",
    nameRu: "Кожаные перчатки",
    descriptionKa: "<p>საზაფხულო ტყავის ხელთათმანები სახსრის დაცვით.</p>",
    descriptionEn: "<p>Summer leather gloves with knuckle protection.</p>",
    descriptionRu: "<p>Летние кожаные перчатки с защитой костяшек.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "LEATHER" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "SUMMER" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
      { kind: "select", definingCategorySlug: "gloves", nameKa: "სამაჯურის ტიპი", optionKey: "GAUNTLET" },
      { kind: "boolean", definingCategorySlug: "gloves", nameKa: "სახსრის დაცვა", value: true },
    ],
    variants: [
      { sizeKey: "S", colorKey: "BLACK", price: 120, stockQuantity: 6, sku: "GLV-REV-S-BLK" },
      { sizeKey: "M", colorKey: "BLACK", price: 120, stockQuantity: 8, sku: "GLV-REV-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 120, stockQuantity: 5, sku: "GLV-REV-L-BLK" },
    ],
  },
  {
    categorySlug: "boots",
    brandSlug: "dainese",
    slug: "motorcycle-boots-dainese",
    nameKa: "მოტო ჩექმები",
    nameEn: "Motorcycle Boots",
    nameRu: "Мотоботинки",
    descriptionKa: "<p>მაღალყელიანი ტყავის ჩექმები სრული სეზონისთვის.</p>",
    descriptionEn: "<p>Tall leather boots for all-season riding.</p>",
    descriptionRu: "<p>Высокие кожаные ботинки для езды в любой сезон.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "LEATHER" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
      { kind: "select", definingCategorySlug: "boots", nameKa: "სიმაღლე", optionKey: "TALL" },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 280, stockQuantity: 4, sku: "BOOT-DAI-M-BLK" }],
  },
  {
    categorySlug: "protection",
    brandSlug: "dainese",
    slug: "back-protector-dainese",
    nameKa: "ზურგის დამცავი",
    nameEn: "Back Protector",
    nameRu: "Защита спины",
    descriptionKa: "<p>ანატომიური ზურგის დამცავი, ჩასაცმელი ქურთუკის ქვეშ.</p>",
    descriptionEn: "<p>Anatomical back protector, worn under the jacket.</p>",
    descriptionRu: "<p>Анатомическая защита спины, надевается под куртку.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "MESH" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 95, stockQuantity: 7, sku: "PROT-DAI-M-BLK" }],
  },
  {
    categorySlug: "rain-gear",
    brandSlug: "revit",
    slug: "rain-suit-revit",
    nameKa: "წვიმის კოსტიუმი",
    nameEn: "Rain Suit",
    nameRu: "Дождевой костюм",
    descriptionKa: "<p>მსუბუქი, სრულად წყალგამძლე კოსტიუმი ზედა ტანსაცმლის ზემოდან.</p>",
    descriptionEn: "<p>Lightweight, fully waterproof over-suit.</p>",
    descriptionRu: "<p>Лёгкий, полностью водонепроницаемый костюм поверх одежды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 85, stockQuantity: 6, sku: "RAIN-REV-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 85, stockQuantity: 6, sku: "RAIN-REV-L-BLK" },
    ],
  },
  {
    categorySlug: "jackets",
    brandSlug: "revit",
    slug: "textile-jacket-revit",
    nameKa: "ტექსტილის სამოტოციკლო ქურთუკი",
    nameEn: "Textile Motorcycle Jacket",
    nameRu: "Текстильная мотокуртка",
    descriptionKa: "<p>ყოვლისმომცველი ტექსტილის ქურთუკი, თავსებადია ცალკე დამცავებთან.</p>",
    descriptionEn: "<p>All-weather textile jacket, compatible with separate armor.</p>",
    descriptionRu: "<p>Всесезонная текстильная куртка, совместима с отдельной защитой.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
      { kind: "select", definingCategorySlug: "jackets", nameKa: "დამცავის CE დონე", optionKey: "CE1" },
    ],
    variants: [
      { sizeKey: "S", colorKey: "BLACK", price: 320, stockQuantity: 4, sku: "JAC-REV-S-BLK" },
      { sizeKey: "M", colorKey: "BLACK", price: 320, stockQuantity: 5, sku: "JAC-REV-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 320, stockQuantity: 4, sku: "JAC-REV-L-BLK" },
    ],
  },
  {
    categorySlug: "jackets",
    brandSlug: "alpinestars",
    slug: "mesh-jacket-alpinestars",
    nameKa: "საზაფხულო mesh ქურთუკი",
    nameEn: "Summer Mesh Jacket",
    nameRu: "Летняя сетчатая куртка",
    descriptionKa: "<p>ვენტილირებადი mesh ქურთუკი ცხელი ამინდისთვის.</p>",
    descriptionEn: "<p>Ventilated mesh jacket for hot weather riding.</p>",
    descriptionRu: "<p>Вентилируемая сетчатая куртка для жаркой погоды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "MESH" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "SUMMER" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
      { kind: "select", definingCategorySlug: "jackets", nameKa: "დამცავის CE დონე", optionKey: "CE1" },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 210, stockQuantity: 5, sku: "JAC-MESH-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 210, stockQuantity: 4, sku: "JAC-MESH-L-BLK" },
    ],
  },
  {
    categorySlug: "gloves",
    brandSlug: "alpinestars",
    slug: "textile-gloves-alpinestars",
    nameKa: "ტექსტილის ხელთათმანები",
    nameEn: "Textile Gloves",
    nameRu: "Текстильные перчатки",
    descriptionKa: "<p>ყოვლისმომცველი ტექსტილის ხელთათმანები სახსრის დაცვით.</p>",
    descriptionEn: "<p>All-weather textile gloves with knuckle protection.</p>",
    descriptionRu: "<p>Всесезонные текстильные перчатки с защитой костяшек.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
      { kind: "select", definingCategorySlug: "gloves", nameKa: "სამაჯურის ტიპი", optionKey: "SHORT_CUFF" },
      { kind: "boolean", definingCategorySlug: "gloves", nameKa: "სახსრის დაცვა", value: true },
    ],
    variants: [
      { sizeKey: "S", colorKey: "BLACK", price: 95, stockQuantity: 6, sku: "GLV-ALP-S-BLK" },
      { sizeKey: "M", colorKey: "BLACK", price: 95, stockQuantity: 7, sku: "GLV-ALP-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 95, stockQuantity: 5, sku: "GLV-ALP-L-BLK" },
    ],
  },
  {
    categorySlug: "gloves",
    brandSlug: "revit",
    slug: "fingerless-gloves-revit",
    nameKa: "საზაფხულო უთითო ხელთათმანები",
    nameEn: "Summer Fingerless Gloves",
    nameRu: "Летние перчатки без пальцев",
    descriptionKa: "<p>მსუბუქი უთითო ხელთათმანები ცხელი დღეებისთვის.</p>",
    descriptionEn: "<p>Lightweight fingerless gloves for hot days.</p>",
    descriptionRu: "<p>Лёгкие перчатки без пальцев для жарких дней.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "LEATHER" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "SUMMER" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
      { kind: "select", definingCategorySlug: "gloves", nameKa: "სამაჯურის ტიპი", optionKey: "FINGERLESS" },
      { kind: "boolean", definingCategorySlug: "gloves", nameKa: "სახსრის დაცვა", value: false },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 55, stockQuantity: 8, sku: "GLV-FL-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 55, stockQuantity: 6, sku: "GLV-FL-L-BLK" },
    ],
  },
  {
    categorySlug: "boots",
    brandSlug: "alpinestars",
    slug: "short-boots-alpinestars",
    nameKa: "მოკლე მოტო ჩექმები",
    nameEn: "Short Motorcycle Boots",
    nameRu: "Короткие мотоботинки",
    descriptionKa: "<p>მოკლე საწვიმო ჩექმები საქალაქო სვლისთვის.</p>",
    descriptionEn: "<p>Short riding boots for everyday city use.</p>",
    descriptionRu: "<p>Короткие мотоботинки для повседневной городской езды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "LEATHER" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "SUMMER" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
      { kind: "select", definingCategorySlug: "boots", nameKa: "სიმაღლე", optionKey: "SHORT" },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 150, stockQuantity: 5, sku: "BOOT-SHORT-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 150, stockQuantity: 4, sku: "BOOT-SHORT-L-BLK" },
    ],
  },
  {
    categorySlug: "boots",
    brandSlug: "revit",
    slug: "touring-boots-revit",
    nameKa: "საგზაო ტურისტული ჩექმები",
    nameEn: "Touring Boots",
    nameRu: "Туристические ботинки",
    descriptionKa: "<p>საშუალო სიმაღლის წყალგამძლე ტურისტული ჩექმები.</p>",
    descriptionEn: "<p>Mid-height waterproof touring boots.</p>",
    descriptionRu: "<p>Туристические ботинки средней высоты, водонепроницаемые.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
      { kind: "select", definingCategorySlug: "boots", nameKa: "სიმაღლე", optionKey: "MEDIUM" },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 240, stockQuantity: 4, sku: "BOOT-TOUR-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 240, stockQuantity: 3, sku: "BOOT-TOUR-L-BLK" },
    ],
  },
  {
    categorySlug: "protection",
    brandSlug: "alpinestars",
    slug: "knee-guards-alpinestars",
    nameKa: "მუხლის დამცავები",
    nameEn: "Knee Guards",
    nameRu: "Наколенники",
    descriptionKa: "<p>ვენტილირებადი მუხლის დამცავები, ჩასაცმელი შარვლის ქვეშ.</p>",
    descriptionEn: "<p>Ventilated knee guards, worn under riding pants.</p>",
    descriptionRu: "<p>Вентилируемые наколенники, надеваются под штаны.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "MESH" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 55, stockQuantity: 8, sku: "PROT-KNEE-M-BLK" }],
  },
  {
    categorySlug: "protection",
    brandSlug: "dainese",
    slug: "chest-protector-dainese",
    nameKa: "გულმკერდის დამცავი",
    nameEn: "Chest Protector",
    nameRu: "Защита груди",
    descriptionKa: "<p>ანატომიური გულმკერდის დამცავი, ჩასაცმელი ქურთუკის ქვეშ.</p>",
    descriptionEn: "<p>Anatomical chest protector, worn under the jacket.</p>",
    descriptionRu: "<p>Анатомическая защита груди, надевается под куртку.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "MESH" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: false },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 110, stockQuantity: 5, sku: "PROT-CHEST-M-BLK" }],
  },
  {
    categorySlug: "rain-gear",
    brandSlug: "revit",
    slug: "rain-jacket-revit",
    nameKa: "წვიმის ქურთუკი",
    nameEn: "Rain Jacket",
    nameRu: "Дождевая куртка",
    descriptionKa: "<p>მსუბუქი წყალგამძლე ქურთუკი, იკეცება პატარა ჩანთაში.</p>",
    descriptionEn: "<p>Lightweight waterproof jacket, packs into a small pouch.</p>",
    descriptionRu: "<p>Лёгкая непромокаемая куртка, складывается в небольшой чехол.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 55, stockQuantity: 6, sku: "RAINJ-REV-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 55, stockQuantity: 6, sku: "RAINJ-REV-L-BLK" },
    ],
  },
  {
    categorySlug: "rain-gear",
    slug: "waterproof-overpants",
    nameKa: "წყალგამძლე შარვალი",
    nameEn: "Waterproof Overpants",
    nameRu: "Непромокаемые штаны",
    descriptionKa: "<p>წყალგამძლე შარვალი ჩასაცმელად ჩვეულებრივი ტანსაცმლის ზემოდან.</p>",
    descriptionEn: "<p>Waterproof overpants, worn over regular riding gear.</p>",
    descriptionRu: "<p>Непромокаемые штаны, надеваются поверх обычной экипировки.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "gear", nameKa: "მასალა", optionKey: "TEXTILE" },
      { kind: "select", definingCategorySlug: "gear", nameKa: "სეზონი", optionKey: "ALL_SEASON" },
      { kind: "boolean", definingCategorySlug: "gear", nameKa: "წყალგამძლეობა", value: true },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 45, stockQuantity: 6, sku: "RAINP-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 45, stockQuantity: 6, sku: "RAINP-L-BLK" },
    ],
  },

  // --- helmets (inherits Shell Material / Safety Certification[required] / Weight) ---
  {
    categorySlug: "helmet-enduro",
    brandSlug: "agv",
    slug: "enduro-helmet-agv",
    nameKa: "ენდურო ჩაფხუტი",
    nameEn: "Enduro Helmet",
    nameRu: "Эндуро шлем",
    descriptionKa: "<p>მსუბუქი ენდურო ჩაფხუტი გახსნილი პირით და მზის ვიზორით.</p>",
    descriptionEn: "<p>Lightweight enduro helmet with open face and sun peak.</p>",
    descriptionRu: "<p>Лёгкий эндуро-шлем с открытым лицом и козырьком.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "POLYCARBONATE" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1500 },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 320, stockQuantity: 4, sku: "HEL-ENDURO-M-BLK" },
      { sizeKey: "L", colorKey: "ORANGE", price: 320, stockQuantity: 3, sku: "HEL-ENDURO-L-ORG" },
    ],
  },
  {
    categorySlug: "helmet-full-face",
    brandSlug: "shoei",
    slug: "full-face-helmet-shoei",
    nameKa: "დახურული ჩაფხუტი",
    nameEn: "Full-Face Helmet",
    nameRu: "Закрытый шлем",
    descriptionKa: "<p>პრემიუმ დახურული ჩაფხუტი მაქსიმალური დაცვისთვის.</p>",
    descriptionEn: "<p>Premium full-face helmet for maximum protection.</p>",
    descriptionRu: "<p>Премиальный закрытый шлем для максимальной защиты.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1450 },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 650, stockQuantity: 3, sku: "HEL-FF-M-BLK" },
      { sizeKey: "L", colorKey: "BLACK", price: 650, stockQuantity: 3, sku: "HEL-FF-L-BLK" },
      { sizeKey: "XL", colorKey: "BLACK", price: 650, stockQuantity: 2, sku: "HEL-FF-XL-BLK" },
      { sizeKey: "M", colorKey: "WHITE", price: 650, stockQuantity: 2, sku: "HEL-FF-M-WHT" },
      { sizeKey: "L", colorKey: "WHITE", price: 650, stockQuantity: 2, sku: "HEL-FF-L-WHT" },
      { sizeKey: "XL", colorKey: "WHITE", price: 650, stockQuantity: 1, sku: "HEL-FF-XL-WHT" },
    ],
    discountPercent: 20,
    discountDays: 14,
  },
  {
    categorySlug: "helmet-full-face",
    brandSlug: "agv",
    slug: "full-face-helmet-agv",
    nameKa: "სპორტული დახურული ჩაფხუტი",
    nameEn: "Sport Full-Face Helmet",
    nameRu: "Спортивный закрытый шлем",
    descriptionKa: "<p>მსუბუქი კარბონის გარსიანი დახურული ჩაფხუტი სპორტული სვლისთვის.</p>",
    descriptionEn: "<p>Lightweight carbon-shell full-face helmet for sport riding.</p>",
    descriptionRu: "<p>Лёгкий закрытый шлем с карбоновой скорлупой для спортивной езды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "CARBON" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "SNELL" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1380 },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 720, stockQuantity: 2, sku: "HEL-FF-AGV-M-BLK" },
      { sizeKey: "L", colorKey: "RED", price: 720, stockQuantity: 2, sku: "HEL-FF-AGV-L-RED" },
    ],
  },
  {
    categorySlug: "helmet-open-face",
    brandSlug: "arai",
    slug: "open-face-helmet-arai",
    nameKa: "ღია ჩაფხუტი",
    nameEn: "Open-Face Helmet",
    nameRu: "Открытый шлем",
    descriptionKa: "<p>კლასიკური ღია ჩაფხუტი საქალაქო სვლისთვის.</p>",
    descriptionEn: "<p>Classic open-face helmet for city riding.</p>",
    descriptionRu: "<p>Классический открытый шлем для городской езды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "DOT" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1300 },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 380, stockQuantity: 4, sku: "HEL-OPEN-M-BLK" }],
  },
  {
    categorySlug: "helmet-modular",
    brandSlug: "agv",
    slug: "modular-helmet-agv",
    nameKa: "მოდულარული ჩაფხუტი",
    nameEn: "Modular Helmet",
    nameRu: "Модульный шлем",
    descriptionKa: "<p>ასახდელი ნიკაპის ნაწილით მოდულარული ჩაფხუტი.</p>",
    descriptionEn: "<p>Modular helmet with a flip-up chin bar.</p>",
    descriptionRu: "<p>Модульный шлем с откидной подбородочной частью.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "CARBON" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1600 },
    ],
    variants: [
      { sizeKey: "M", colorKey: "BLACK", price: 590, stockQuantity: 3, sku: "HEL-MOD-M-BLK" },
      { sizeKey: "L", colorKey: "SILVER", price: 590, stockQuantity: 2, sku: "HEL-MOD-L-SLV" },
    ],
  },
  {
    categorySlug: "helmet-visor",
    brandSlug: "shoei",
    slug: "helmet-visor-shoei",
    nameKa: "ჩაფხუტის ვიზორი",
    nameEn: "Helmet Visor",
    nameRu: "Визор для шлема",
    descriptionKa: "<p>საცვლელი ვიზორი, თავსებადია სტანდარტულ ჩაფხუტებთან.</p>",
    descriptionEn: "<p>Replacement visor, compatible with standard helmets.</p>",
    descriptionRu: "<p>Сменный визор, совместим со стандартными шлемами.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "POLYCARBONATE" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 150 },
    ],
    variants: [{ colorKey: "SILVER", price: 45, stockQuantity: 10, sku: "VISOR-SHOEI-SLV" }],
  },
  {
    categorySlug: "helmet-enduro",
    brandSlug: "shoei",
    slug: "enduro-helmet-shoei",
    nameKa: "პრემიუმ ენდურო ჩაფხუტი",
    nameEn: "Premium Enduro Helmet",
    nameRu: "Премиум эндуро-шлем",
    descriptionKa: "<p>პრემიუმ კლასის ენდურო ჩაფხუტი, გაძლიერებული ვენტილაციით.</p>",
    descriptionEn: "<p>Premium-class enduro helmet with enhanced ventilation.</p>",
    descriptionRu: "<p>Эндуро-шлем премиум-класса с усиленной вентиляцией.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1550 },
    ],
    variants: [{ sizeKey: "M", colorKey: "ORANGE", price: 410, stockQuantity: 3, sku: "HEL-ENDURO-SHOEI-M-ORG" }],
  },
  {
    categorySlug: "helmet-enduro",
    brandSlug: "arai",
    slug: "enduro-helmet-arai",
    nameKa: "მსუბუქი ენდურო ჩაფხუტი",
    nameEn: "Lightweight Enduro Helmet",
    nameRu: "Лёгкий эндуро-шлем",
    descriptionKa: "<p>კარბონის გარსიანი მსუბუქი ენდურო ჩაფხუტი.</p>",
    descriptionEn: "<p>Carbon-shell lightweight enduro helmet.</p>",
    descriptionRu: "<p>Лёгкий эндуро-шлем с карбоновой скорлупой.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "CARBON" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "SNELL" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1350 },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 480, stockQuantity: 2, sku: "HEL-ENDURO-ARAI-M-BLK" }],
  },
  {
    categorySlug: "helmet-full-face",
    brandSlug: "arai",
    slug: "full-face-helmet-arai",
    nameKa: "სპორტ-ტურინგ დახურული ჩაფხუტი",
    nameEn: "Sport-Touring Full-Face Helmet",
    nameRu: "Спорт-туринг закрытый шлем",
    descriptionKa: "<p>დაბალანსებული დახურული ჩაფხუტი გრძელი მარშრუტებისთვის.</p>",
    descriptionEn: "<p>Balanced full-face helmet for long-distance riding.</p>",
    descriptionRu: "<p>Сбалансированный закрытый шлем для дальних поездок.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "DOT" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1500 },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 610, stockQuantity: 3, sku: "HEL-FF-ARAI-M-BLK" }],
  },
  {
    categorySlug: "helmet-open-face",
    brandSlug: "agv",
    slug: "open-face-helmet-agv",
    nameKa: "რეტრო ღია ჩაფხუტი",
    nameEn: "Retro Open-Face Helmet",
    nameRu: "Ретро открытый шлем",
    descriptionKa: "<p>რეტრო სტილის ღია ჩაფხუტი, თანამედროვე უსაფრთხოებით.</p>",
    descriptionEn: "<p>Retro-styled open-face helmet with modern safety.</p>",
    descriptionRu: "<p>Открытый шлем в ретро-стиле с современной защитой.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "ABS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1250 },
    ],
    variants: [{ sizeKey: "M", colorKey: "SILVER", price: 290, stockQuantity: 4, sku: "HEL-OPEN-AGV-M-SLV" }],
  },
  {
    categorySlug: "helmet-open-face",
    brandSlug: "shoei",
    slug: "open-face-helmet-shoei",
    nameKa: "პრემიუმ ღია ჩაფხუტი",
    nameEn: "Premium Open-Face Helmet",
    nameRu: "Премиум открытый шлем",
    descriptionKa: "<p>პრემიუმ კლასის ღია ჩაფხუტი საქალაქო სვლისთვის.</p>",
    descriptionEn: "<p>Premium-class open-face helmet for city riding.</p>",
    descriptionRu: "<p>Открытый шлем премиум-класса для городской езды.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "DOT" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1200 },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 420, stockQuantity: 3, sku: "HEL-OPEN-SHOEI-M-BLK" }],
  },
  {
    categorySlug: "helmet-modular",
    brandSlug: "shoei",
    slug: "modular-helmet-shoei",
    nameKa: "პრემიუმ მოდულარული ჩაფხუტი",
    nameEn: "Premium Modular Helmet",
    nameRu: "Премиум модульный шлем",
    descriptionKa: "<p>პრემიუმ კლასის მოდულარული ჩაფხუტი მშვიდი ტურისთვის.</p>",
    descriptionEn: "<p>Premium-class modular helmet for relaxed touring.</p>",
    descriptionRu: "<p>Модульный шлем премиум-класса для спокойных поездок.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "FIBERGLASS" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1650 },
    ],
    variants: [{ sizeKey: "M", colorKey: "BLACK", price: 640, stockQuantity: 3, sku: "HEL-MOD-SHOEI-M-BLK" }],
  },
  {
    categorySlug: "helmet-modular",
    brandSlug: "arai",
    slug: "modular-helmet-arai",
    nameKa: "მსუბუქი მოდულარული ჩაფხუტი",
    nameEn: "Lightweight Modular Helmet",
    nameRu: "Лёгкий модульный шлем",
    descriptionKa: "<p>კარბონის გარსიანი მსუბუქი მოდულარული ჩაფხუტი.</p>",
    descriptionEn: "<p>Carbon-shell lightweight modular helmet.</p>",
    descriptionRu: "<p>Лёгкий модульный шлем с карбоновой скорлупой.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "CARBON" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "SNELL" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 1450 },
    ],
    variants: [{ sizeKey: "L", colorKey: "SILVER", price: 710, stockQuantity: 2, sku: "HEL-MOD-ARAI-L-SLV" }],
  },
  {
    categorySlug: "helmet-visor",
    brandSlug: "agv",
    slug: "helmet-visor-agv",
    nameKa: "სათადარიგო ვიზორი (მუქი)",
    nameEn: "Replacement Visor (Tinted)",
    nameRu: "Сменный визор (тонированный)",
    descriptionKa: "<p>მუქი სათადარიგო ვიზორი, თავსებადია სტანდარტულ ჩაფხუტებთან.</p>",
    descriptionEn: "<p>Tinted replacement visor, compatible with standard helmets.</p>",
    descriptionRu: "<p>Тонированный сменный визор, совместим со стандартными шлемами.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "POLYCARBONATE" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 140 },
    ],
    variants: [{ colorKey: "BLACK", price: 50, stockQuantity: 9, sku: "VISOR-AGV-BLK" }],
  },
  {
    categorySlug: "helmet-visor",
    brandSlug: "arai",
    slug: "helmet-visor-arai",
    nameKa: "სათადარიგო ვიზორი (გამჭვირვალე)",
    nameEn: "Replacement Visor (Clear)",
    nameRu: "Сменный визор (прозрачный)",
    descriptionKa: "<p>გამჭვირვალე სათადარიგო ვიზორი, თავსებადია სტანდარტულ ჩაფხუტებთან.</p>",
    descriptionEn: "<p>Clear replacement visor, compatible with standard helmets.</p>",
    descriptionRu: "<p>Прозрачный сменный визор, совместим со стандартными шлемами.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "helmets", nameKa: "გარსის მასალა", optionKey: "POLYCARBONATE" },
      { kind: "select", definingCategorySlug: "helmets", nameKa: "უსაფრთხოების სერტიფიკატი", optionKey: "ECE" },
      { kind: "number", definingCategorySlug: "helmets", nameKa: "წონა", value: 130 },
    ],
    variants: [{ colorKey: "SILVER", price: 42, stockQuantity: 11, sku: "VISOR-ARAI-SLV" }],
  },

  // --- transport (no category attributes) ---
  {
    categorySlug: "motorcycles",
    slug: "street-motorcycle",
    nameKa: "საგზაო მოტოციკლი",
    nameEn: "Street Motorcycle",
    nameRu: "Дорожный мотоцикл",
    descriptionKa: "<p>საგზაო ტიპის მოტოციკლი ყოველდღიური სვლისთვის.</p>",
    descriptionEn: "<p>Street-type motorcycle for everyday riding.</p>",
    descriptionRu: "<p>Дорожный мотоцикл для повседневной езды.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 8500, stockQuantity: 1, sku: "MOTO-STREET-BLK" }],
  },
  {
    categorySlug: "atvs",
    slug: "utility-atv",
    nameKa: "სამუშაო კვადროციკლი",
    nameEn: "Utility ATV",
    nameRu: "Утилитарный квадроцикл",
    descriptionKa: "<p>4x4 სამუშაო კვადროციკლი გაუვალ ადგილებში მუშაობისთვის.</p>",
    descriptionEn: "<p>4x4 utility ATV for off-road work.</p>",
    descriptionRu: "<p>Утилитарный квадроцикл 4x4 для бездорожья.</p>",
    attributes: [],
    variants: [{ colorKey: "GREEN", price: 6200, stockQuantity: 1, sku: "ATV-UTIL-GRN" }],
  },
  {
    categorySlug: "scooters",
    slug: "city-scooter",
    nameKa: "საქალაქო სკუტერი",
    nameEn: "City Scooter",
    nameRu: "Городской скутер",
    descriptionKa: "<p>ეკონომიური საქალაქო სკუტერი, ავტომატური გადაცემათა კოლოფით.</p>",
    descriptionEn: "<p>Economical city scooter with automatic transmission.</p>",
    descriptionRu: "<p>Экономичный городской скутер с автоматической коробкой.</p>",
    attributes: [],
    variants: [{ colorKey: "WHITE", price: 3200, stockQuantity: 2, sku: "SCOOT-CITY-WHT" }],
  },
  {
    categorySlug: "kick-scooters",
    slug: "electric-kick-scooter",
    nameKa: "ელექტრო სქროლი",
    nameEn: "Electric Kick Scooter",
    nameRu: "Электросамокат",
    descriptionKa: "<p>ორსაბურავიანი ელექტრო სქროლი, რომელზეც მძღოლი ფეხზე დგას.</p>",
    descriptionEn: "<p>Two-wheeled electric kick scooter, ridden standing up.</p>",
    descriptionRu: "<p>Двухколёсный электросамокат, на котором едут стоя.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 950, stockQuantity: 5, sku: "KICK-ELEC-BLK" }],
  },
  {
    categorySlug: "motorcycles",
    slug: "cruiser-motorcycle",
    nameKa: "კრუიზერი მოტოციკლი",
    nameEn: "Cruiser Motorcycle",
    nameRu: "Мотоцикл круизер",
    descriptionKa: "<p>დაბალი, კომფორტული კრუიზერი გრძელი ტურებისთვის.</p>",
    descriptionEn: "<p>Low, comfortable cruiser for long-distance touring.</p>",
    descriptionRu: "<p>Низкий, комфортный круизер для дальних поездок.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 9800, stockQuantity: 1, sku: "MOTO-CRUISER-BLK" }],
  },
  {
    categorySlug: "motorcycles",
    slug: "adventure-motorcycle",
    nameKa: "სათავგადასავლო მოტოციკლი",
    nameEn: "Adventure Motorcycle",
    nameRu: "Мотоцикл adventure",
    descriptionKa: "<p>სათავგადასავლო ტიპის მოტოციკლი გზისა და ოფროუდისთვის.</p>",
    descriptionEn: "<p>Adventure-type motorcycle for both road and off-road.</p>",
    descriptionRu: "<p>Мотоцикл adventure для дороги и бездорожья.</p>",
    attributes: [],
    variants: [{ colorKey: "ORANGE", price: 11500, stockQuantity: 1, sku: "MOTO-ADV-ORG" }],
  },
  {
    categorySlug: "atvs",
    slug: "sport-atv",
    nameKa: "სპორტული კვადროციკლი",
    nameEn: "Sport ATV",
    nameRu: "Спортивный квадроцикл",
    descriptionKa: "<p>მსუბუქი, სწრაფი კვადროციკლი სპორტული სვლისთვის.</p>",
    descriptionEn: "<p>Light, fast ATV built for sport riding.</p>",
    descriptionRu: "<p>Лёгкий, быстрый квадроцикл для спортивной езды.</p>",
    attributes: [],
    variants: [{ colorKey: "RED", price: 7400, stockQuantity: 1, sku: "ATV-SPORT-RED" }],
  },
  {
    categorySlug: "atvs",
    slug: "youth-atv",
    nameKa: "საბავშვო კვადროციკლი",
    nameEn: "Youth ATV",
    nameRu: "Детский квадроцикл",
    descriptionKa: "<p>შემცირებული სიმძლავრის კვადროციკლი მოზარდებისთვის.</p>",
    descriptionEn: "<p>Power-limited ATV designed for younger riders.</p>",
    descriptionRu: "<p>Квадроцикл с ограниченной мощностью для подростков.</p>",
    attributes: [],
    variants: [{ colorKey: "BLUE", price: 3200, stockQuantity: 2, sku: "ATV-YOUTH-BLU" }],
  },
  {
    categorySlug: "scooters",
    slug: "sport-scooter",
    nameKa: "სპორტული სკუტერი",
    nameEn: "Sport Scooter",
    nameRu: "Спортивный скутер",
    descriptionKa: "<p>დინამიური სკუტერი გაძლიერებული აჩქარებით.</p>",
    descriptionEn: "<p>Sporty scooter with punchier acceleration.</p>",
    descriptionRu: "<p>Спортивный скутер с динамичным разгоном.</p>",
    attributes: [],
    variants: [{ colorKey: "RED", price: 4100, stockQuantity: 2, sku: "SCOOT-SPORT-RED" }],
  },
  {
    categorySlug: "scooters",
    slug: "retro-scooter",
    nameKa: "რეტრო სკუტერი",
    nameEn: "Retro Scooter",
    nameRu: "Ретро скутер",
    descriptionKa: "<p>კლასიკური დიზაინის სკუტერი თანამედროვე ტექნიკით.</p>",
    descriptionEn: "<p>Classic-styled scooter with modern mechanics.</p>",
    descriptionRu: "<p>Скутер в классическом стиле с современной механикой.</p>",
    attributes: [],
    variants: [{ colorKey: "YELLOW", price: 3800, stockQuantity: 2, sku: "SCOOT-RETRO-YEL" }],
  },
  {
    categorySlug: "kick-scooters",
    slug: "off-road-kick-scooter",
    nameKa: "ოფროუდ ელექტრო სქროლი",
    nameEn: "Off-Road Electric Kick Scooter",
    nameRu: "Внедорожный электросамокат",
    descriptionKa: "<p>დიდი საბურავებიანი ელექტრო სქროლი უსწორმასწორო რელიეფისთვის.</p>",
    descriptionEn: "<p>Big-wheeled electric kick scooter for rough terrain.</p>",
    descriptionRu: "<p>Электросамокат с большими колёсами для бездорожья.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 1450, stockQuantity: 3, sku: "KICK-OFFROAD-BLK" }],
  },
  {
    categorySlug: "kick-scooters",
    slug: "compact-kick-scooter",
    nameKa: "კომპაქტური ელექტრო სქროლი",
    nameEn: "Compact Electric Kick Scooter",
    nameRu: "Компактный электросамокат",
    descriptionKa: "<p>მსუბუქი, დასაკეცი ელექტრო სქროლი ყოველდღიური გადაადგილებისთვის.</p>",
    descriptionEn: "<p>Light, foldable electric kick scooter for daily commuting.</p>",
    descriptionRu: "<p>Лёгкий складной электросамокат для повседневных поездок.</p>",
    attributes: [],
    variants: [{ colorKey: "GRAY", price: 650, stockQuantity: 6, sku: "KICK-COMPACT-GRY" }],
  },

  // --- accessories ---
  {
    categorySlug: "luggage",
    brandSlug: "givi",
    slug: "saddlebag-givi",
    nameKa: "საბარგო ჩანთა",
    nameEn: "Saddlebag",
    nameRu: "Боковая сумка",
    descriptionKa: "<p>წყალგამძლე გვერდითი საბარგო ჩანთა, სწრაფი დამაგრებით.</p>",
    descriptionEn: "<p>Waterproof saddlebag with quick-release mounting.</p>",
    descriptionRu: "<p>Водонепроницаемая боковая сумка с быстрым креплением.</p>",
    attributes: [
      { kind: "number", definingCategorySlug: "luggage", nameKa: "მოცულობა (ლ)", value: 35 },
      { kind: "boolean", definingCategorySlug: "luggage", nameKa: "წყალგამძლეობა", value: true },
    ],
    variants: [{ colorKey: "BLACK", price: 210, stockQuantity: 5, sku: "BAG-GIVI-BLK" }],
  },
  {
    categorySlug: "electronics",
    slug: "gps-navigator",
    nameKa: "GPS ნავიგატორი",
    nameEn: "GPS Navigator",
    nameRu: "GPS-навигатор",
    descriptionKa: "<p>წყალგამძლე GPS ნავიგატორი მოტოციკლისთვის.</p>",
    descriptionEn: "<p>Weatherproof GPS navigator for motorcycles.</p>",
    descriptionRu: "<p>Влагозащищённый GPS-навигатор для мотоцикла.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 340, stockQuantity: 3, sku: "GPS-NAV-BLK" }],
  },
  {
    categorySlug: "security",
    brandSlug: "xena",
    slug: "disc-lock-xena",
    nameKa: "დისკის საკეტი",
    nameEn: "Disc Lock",
    nameRu: "Замок на диск",
    descriptionKa: "<p>სასიგნალო დისკის საკეტი დამატებითი დაცვისთვის.</p>",
    descriptionEn: "<p>Alarm disc lock for extra security.</p>",
    descriptionRu: "<p>Замок на диск с сигнализацией для доп. защиты.</p>",
    attributes: [],
    variants: [{ colorKey: "SILVER", price: 65, stockQuantity: 8, sku: "LOCK-XENA-SLV" }],
  },
  {
    categorySlug: "luggage",
    brandSlug: "givi",
    slug: "top-case-givi",
    nameKa: "საბარგო ყუთი (ტოპ-ქეისი)",
    nameEn: "Top Case",
    nameRu: "Верхний кофр",
    descriptionKa: "<p>დიდი მოცულობის საბარგო ყუთი, თავსდება ერთი დახურული ჩაფხუტი.</p>",
    descriptionEn: "<p>Large-capacity top case, fits one full-face helmet.</p>",
    descriptionRu: "<p>Кофр большого объёма, вмещает один закрытый шлем.</p>",
    attributes: [
      { kind: "number", definingCategorySlug: "luggage", nameKa: "მოცულობა (ლ)", value: 45 },
      { kind: "boolean", definingCategorySlug: "luggage", nameKa: "წყალგამძლეობა", value: true },
    ],
    variants: [{ colorKey: "BLACK", price: 260, stockQuantity: 4, sku: "TOPCASE-GIVI-BLK" }],
  },
  {
    categorySlug: "luggage",
    brandSlug: "sw-motech",
    slug: "tank-bag-sw-motech",
    nameKa: "ავზის ჩანთა",
    nameEn: "Tank Bag",
    nameRu: "Сумка на бак",
    descriptionKa: "<p>მაგნიტური ავზის ჩანთა ყოველდღიური ნივთებისთვის.</p>",
    descriptionEn: "<p>Magnetic tank bag for everyday essentials.</p>",
    descriptionRu: "<p>Магнитная сумка на бак для повседневных вещей.</p>",
    attributes: [
      { kind: "number", definingCategorySlug: "luggage", nameKa: "მოცულობა (ლ)", value: 8 },
      { kind: "boolean", definingCategorySlug: "luggage", nameKa: "წყალგამძლეობა", value: false },
    ],
    variants: [{ colorKey: "BLACK", price: 95, stockQuantity: 6, sku: "TANKBAG-SWM-BLK" }],
  },
  {
    categorySlug: "electronics",
    slug: "action-camera-mount",
    nameKa: "სამოქმედო კამერის სამაგრი",
    nameEn: "Action Camera Mount",
    nameRu: "Крепление для экшн-камеры",
    descriptionKa: "<p>ვიბრაციამედეგი სამაგრი სამოქმედო კამერისთვის.</p>",
    descriptionEn: "<p>Vibration-resistant mount for action cameras.</p>",
    descriptionRu: "<p>Виброустойчивое крепление для экшн-камер.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 45, stockQuantity: 10, sku: "MOUNT-CAM-BLK" }],
  },
  {
    categorySlug: "electronics",
    slug: "usb-charger-kit",
    nameKa: "USB დამტენის კომპლექტი",
    nameEn: "USB Charger Kit",
    nameRu: "Комплект USB-зарядки",
    descriptionKa: "<p>წყალგამძლე USB დამტენი ტელეფონისა და ნავიგატორისთვის.</p>",
    descriptionEn: "<p>Waterproof USB charger for phones and navigators.</p>",
    descriptionRu: "<p>Влагозащищённая USB-зарядка для телефона и навигатора.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 38, stockQuantity: 12, sku: "USB-KIT-BLK" }],
  },
  {
    categorySlug: "security",
    brandSlug: "xena",
    slug: "chain-lock-xena",
    nameKa: "ჯაჭვის საკეტი",
    nameEn: "Chain Lock",
    nameRu: "Цепь с замком",
    descriptionKa: "<p>მძიმე ჯაჭვის საკეტი მაღალი უსაფრთხოებისთვის.</p>",
    descriptionEn: "<p>Heavy-duty chain lock for high security.</p>",
    descriptionRu: "<p>Прочная цепь с замком для повышенной безопасности.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 85, stockQuantity: 5, sku: "CHAINLOCK-XENA-BLK" }],
  },
  {
    categorySlug: "security",
    brandSlug: "xena",
    slug: "alarm-system-xena",
    nameKa: "სასიგნალო სისტემა",
    nameEn: "Alarm System",
    nameRu: "Сигнализация",
    descriptionKa: "<p>ორმაგი ზონის სასიგნალო სისტემა დისტანციური მართვით.</p>",
    descriptionEn: "<p>Dual-zone alarm system with remote control.</p>",
    descriptionRu: "<p>Двухзонная сигнализация с пультом дистанционного управления.</p>",
    attributes: [],
    variants: [{ colorKey: "BLACK", price: 130, stockQuantity: 4, sku: "ALARM-XENA-BLK" }],
  },

  // --- parts (inherits Origin[required]) ---
  {
    categorySlug: "brakes",
    brandSlug: "brembo",
    slug: "brake-discs-brembo",
    nameKa: "სამუხრუჭე დისკები",
    nameEn: "Brake Discs",
    nameRu: "Тормозные диски",
    descriptionKa: "<p>სინტერული სამუხრუჭე დისკები, ორიგინალი შემცვლელი.</p>",
    descriptionEn: "<p>Sintered brake discs, OEM replacement.</p>",
    descriptionRu: "<p>Спечённые тормозные диски, оригинальная замена.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "select", definingCategorySlug: "brakes", nameKa: "მასალა/კომპაუნდი", optionKey: "SINTERED" },
    ],
    variants: [{ price: 180, stockQuantity: 6, sku: "BRK-BREMBO-001" }],
    fitmentVehicleSlug: "yamaha-mt-07",
  },
  {
    categorySlug: "batteries",
    brandSlug: "yuasa",
    slug: "motorcycle-battery-yuasa",
    nameKa: "მოტო აკუმულატორი",
    nameEn: "Motorcycle Battery",
    nameRu: "Мото аккумулятор",
    descriptionKa: "<p>ლითიუმის მოტოციკლის აკუმულატორი, მსუბუქი და კომპაქტური.</p>",
    descriptionEn: "<p>Lithium motorcycle battery, light and compact.</p>",
    descriptionRu: "<p>Литиевый мотоаккумулятор, лёгкий и компактный.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "select", definingCategorySlug: "batteries", nameKa: "ტიპი", optionKey: "LITHIUM" },
      { kind: "number", definingCategorySlug: "batteries", nameKa: "ტევადობა (Ah)", value: 8 },
    ],
    variants: [{ price: 140, stockQuantity: 5, sku: "BAT-YUASA-001" }],
  },
  {
    categorySlug: "tires",
    brandSlug: "michelin",
    slug: "road-tire-michelin",
    nameKa: "საგზაო საბურავი",
    nameEn: "Road Tire",
    nameRu: "Дорожная шина",
    descriptionKa: "<p>რადიალური საგზაო საბურავი კარგი მოცურვის საწინააღმდეგო თვისებებით.</p>",
    descriptionEn: "<p>Radial road tire with strong wet-grip performance.</p>",
    descriptionRu: "<p>Радиальная дорожная шина с хорошим сцеплением на мокрой дороге.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "text", definingCategorySlug: "tires", nameKa: "ზომა", value: "120/70-17" },
      { kind: "select", definingCategorySlug: "tires", nameKa: "კონსტრუქცია", optionKey: "RADIAL" },
    ],
    variants: [{ price: 220, stockQuantity: 8, sku: "TIRE-MICH-001" }],
  },
  {
    categorySlug: "filters",
    slug: "air-filter",
    nameKa: "საჰაერო ფილტრი",
    nameEn: "Air Filter",
    nameRu: "Воздушный фильтр",
    descriptionKa: "<p>მაღალი ხარისხის საჰაერო ფილტრი, აუმჯობესებს ძრავის სუნთქვას.</p>",
    descriptionEn: "<p>High-flow air filter for improved engine breathing.</p>",
    descriptionRu: "<p>Высокопроизводительный воздушный фильтр.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" }],
    variants: [{ price: 35, stockQuantity: 12, sku: "FLT-AIR-001" }],
  },
  {
    categorySlug: "fluids",
    brandSlug: "motul",
    slug: "engine-oil-motul",
    nameKa: "ძრავის ზეთი",
    nameEn: "Engine Oil",
    nameRu: "Моторное масло",
    descriptionKa: "<p>სრულად სინთეზური ძრავის ზეთი მოტოციკლებისთვის.</p>",
    descriptionEn: "<p>Fully synthetic engine oil for motorcycles.</p>",
    descriptionRu: "<p>Полностью синтетическое моторное масло для мотоциклов.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" }],
    variants: [{ price: 55, stockQuantity: 15, sku: "OIL-MOTUL-001" }],
  },
  {
    categorySlug: "exhaust",
    slug: "full-exhaust-system",
    nameKa: "სრული გამონაბოლქვის სისტემა",
    nameEn: "Full Exhaust System",
    nameRu: "Полная выхлопная система",
    descriptionKa: "<p>ტიტანის სრული გამონაბოლქვის სისტემა, მსუბუქი და ხმაურიანი.</p>",
    descriptionEn: "<p>Titanium full exhaust system, light and loud.</p>",
    descriptionRu: "<p>Титановая полная выхлопная система, лёгкая и громкая.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "ტიპი", optionKey: "FULL_SYSTEM" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "მასალა", optionKey: "TITANIUM" },
    ],
    variants: [{ price: 890, stockQuantity: 2, sku: "EXH-FULL-001" }],
    fitmentVehicleSlug: "yamaha-mt-07",
  },
  {
    categorySlug: "brakes",
    brandSlug: "brembo",
    slug: "brake-pads-brembo",
    nameKa: "სამუხრუჭე ხუნდები",
    nameEn: "Brake Pads",
    nameRu: "Тормозные колодки",
    descriptionKa: "<p>ორგანული სამუხრუჭე ხუნდები, მშვიდი და ხმაურის გარეშე.</p>",
    descriptionEn: "<p>Organic brake pads, smooth and quiet.</p>",
    descriptionRu: "<p>Органические тормозные колодки, тихие и мягкие.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "select", definingCategorySlug: "brakes", nameKa: "მასალა/კომპაუნდი", optionKey: "ORGANIC" },
    ],
    variants: [{ price: 65, stockQuantity: 10, sku: "BRK-PADS-BREMBO-001" }],
  },
  {
    categorySlug: "brakes",
    brandSlug: "brembo",
    slug: "brake-lines-brembo",
    nameKa: "სამუხრუჭე მილები",
    nameEn: "Brake Lines",
    nameRu: "Тормозные шланги",
    descriptionKa: "<p>დაწნეხილი უჟანგავი ფოლადის სამუხრუჭე მილები, მკვეთრი მოქმედებით.</p>",
    descriptionEn: "<p>Braided stainless-steel brake lines for sharper feel.</p>",
    descriptionRu: "<p>Плетёные тормозные шланги из нержавеющей стали.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" },
      { kind: "select", definingCategorySlug: "brakes", nameKa: "მასალა/კომპაუნდი", optionKey: "SINTERED" },
    ],
    variants: [{ price: 95, stockQuantity: 8, sku: "BRK-LINES-BREMBO-001" }],
  },
  {
    categorySlug: "batteries",
    brandSlug: "yuasa",
    slug: "battery-lead-acid-yuasa",
    nameKa: "ტყვია-მჟავა აკუმულატორი",
    nameEn: "Lead-Acid Battery",
    nameRu: "Свинцово-кислотный аккумулятор",
    descriptionKa: "<p>საიმედო ტყვია-მჟავა აკუმულატორი სტანდარტული მოტოციკლებისთვის.</p>",
    descriptionEn: "<p>Reliable lead-acid battery for standard motorcycles.</p>",
    descriptionRu: "<p>Надёжный свинцово-кислотный аккумулятор для мотоциклов.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "select", definingCategorySlug: "batteries", nameKa: "ტიპი", optionKey: "LEAD_ACID" },
      { kind: "number", definingCategorySlug: "batteries", nameKa: "ტევადობა (Ah)", value: 12 },
    ],
    variants: [{ price: 75, stockQuantity: 6, sku: "BAT-LEADACID-001" }],
  },
  {
    categorySlug: "batteries",
    brandSlug: "yuasa",
    slug: "battery-agm-yuasa",
    nameKa: "AGM აკუმულატორი",
    nameEn: "AGM Battery",
    nameRu: "AGM аккумулятор",
    descriptionKa: "<p>ჰერმეტული AGM აკუმულატორი, ვარდნაზე გამძლე.</p>",
    descriptionEn: "<p>Sealed AGM battery, spill-proof and vibration-resistant.</p>",
    descriptionRu: "<p>Герметичный AGM аккумулятор, устойчив к вибрации.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "select", definingCategorySlug: "batteries", nameKa: "ტიპი", optionKey: "AGM" },
      { kind: "number", definingCategorySlug: "batteries", nameKa: "ტევადობა (Ah)", value: 10 },
    ],
    variants: [{ price: 110, stockQuantity: 5, sku: "BAT-AGM-001" }],
  },
  {
    categorySlug: "tires",
    brandSlug: "pirelli",
    slug: "sport-tire-pirelli",
    nameKa: "სპორტული საბურავი",
    nameEn: "Sport Tire",
    nameRu: "Спортивная шина",
    descriptionKa: "<p>სპორტული რადიალური საბურავი, გაძლიერებული მოქცევებში.</p>",
    descriptionEn: "<p>Sport radial tire with strong cornering grip.</p>",
    descriptionRu: "<p>Спортивная радиальная шина с хорошим сцеплением в поворотах.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" },
      { kind: "text", definingCategorySlug: "tires", nameKa: "ზომა", value: "190/55-17" },
      { kind: "select", definingCategorySlug: "tires", nameKa: "კონსტრუქცია", optionKey: "RADIAL" },
    ],
    variants: [{ price: 260, stockQuantity: 6, sku: "TIRE-SPORT-PIRELLI-001" }],
  },
  {
    categorySlug: "tires",
    brandSlug: "dunlop",
    slug: "offroad-tire-dunlop",
    nameKa: "ოფროუდ საბურავი",
    nameEn: "Off-Road Tire",
    nameRu: "Внедорожная шина",
    descriptionKa: "<p>ღრმა ნაკვთიანი ოფროუდ საბურავი გაუვალი გზებისთვის.</p>",
    descriptionEn: "<p>Deep-tread off-road tire for rough terrain.</p>",
    descriptionRu: "<p>Внедорожная шина с глубоким протектором.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" },
      { kind: "text", definingCategorySlug: "tires", nameKa: "ზომა", value: "90/90-21" },
      { kind: "select", definingCategorySlug: "tires", nameKa: "კონსტრუქცია", optionKey: "BIAS" },
    ],
    variants: [{ price: 190, stockQuantity: 7, sku: "TIRE-OFFROAD-DUNLOP-001" }],
  },
  {
    categorySlug: "filters",
    slug: "oil-filter",
    nameKa: "ზეთის ფილტრი",
    nameEn: "Oil Filter",
    nameRu: "Масляный фильтр",
    descriptionKa: "<p>ორიგინალი შემცვლელი ზეთის ფილტრი.</p>",
    descriptionEn: "<p>OEM-replacement oil filter.</p>",
    descriptionRu: "<p>Оригинальный сменный масляный фильтр.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" }],
    variants: [{ price: 18, stockQuantity: 20, sku: "FLT-OIL-001" }],
  },
  {
    categorySlug: "filters",
    slug: "fuel-filter",
    nameKa: "საწვავის ფილტრი",
    nameEn: "Fuel Filter",
    nameRu: "Топливный фильтр",
    descriptionKa: "<p>საწვავის ფილტრი, იცავს ინჟექტორებს დაბინძურებისგან.</p>",
    descriptionEn: "<p>Fuel filter, protects injectors from contamination.</p>",
    descriptionRu: "<p>Топливный фильтр, защищает форсунки от загрязнений.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" }],
    variants: [{ price: 22, stockQuantity: 15, sku: "FLT-FUEL-001" }],
  },
  {
    categorySlug: "fluids",
    brandSlug: "motul",
    slug: "chain-lube-motul",
    nameKa: "ჯაჭვის საპოხი",
    nameEn: "Chain Lube",
    nameRu: "Смазка для цепи",
    descriptionKa: "<p>წყალგამძლე ჯაჭვის საპოხი, ამცირებს ცვეთას.</p>",
    descriptionEn: "<p>Waterproof chain lube that reduces wear.</p>",
    descriptionRu: "<p>Водостойкая смазка для цепи, снижает износ.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" }],
    variants: [{ price: 25, stockQuantity: 20, sku: "FLUID-CHAINLUBE-001" }],
  },
  {
    categorySlug: "fluids",
    brandSlug: "castrol",
    slug: "coolant-castrol",
    nameKa: "გამაგრილებელი სითხე",
    nameEn: "Coolant",
    nameRu: "Охлаждающая жидкость",
    descriptionKa: "<p>წინასწარ განზავებული გამაგრილებელი სითხე, კოროზიის საწინააღმდეგო.</p>",
    descriptionEn: "<p>Pre-mixed coolant with corrosion protection.</p>",
    descriptionRu: "<p>Готовая охлаждающая жидкость с защитой от коррозии.</p>",
    attributes: [{ kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "OEM" }],
    variants: [{ price: 30, stockQuantity: 18, sku: "FLUID-COOLANT-001" }],
  },
  {
    categorySlug: "exhaust",
    slug: "slip-on-exhaust",
    nameKa: "Slip-on დახშული",
    nameEn: "Slip-On Exhaust",
    nameRu: "Слип-он глушитель",
    descriptionKa: "<p>მსუბუქი უჟანგავი ფოლადის slip-on დახშული.</p>",
    descriptionEn: "<p>Lightweight stainless-steel slip-on exhaust.</p>",
    descriptionRu: "<p>Лёгкий слип-он глушитель из нержавеющей стали.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "ტიპი", optionKey: "SLIP_ON" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "მასალა", optionKey: "STAINLESS_STEEL" },
    ],
    variants: [{ price: 420, stockQuantity: 4, sku: "EXH-SLIPON-001" }],
  },
  {
    categorySlug: "exhaust",
    slug: "exhaust-header",
    nameKa: "გამონაბოლქვის კოლექტორი",
    nameEn: "Exhaust Header",
    nameRu: "Выпускной коллектор",
    descriptionKa: "<p>ალუმინის გამონაბოლქვის კოლექტორი გაუმჯობესებული ნაკადისთვის.</p>",
    descriptionEn: "<p>Aluminum exhaust header for improved flow.</p>",
    descriptionRu: "<p>Алюминиевый выпускной коллектор для лучшего потока.</p>",
    attributes: [
      { kind: "select", definingCategorySlug: "parts", nameKa: "წარმოშობა", optionKey: "AFTERMARKET" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "ტიპი", optionKey: "HEADER" },
      { kind: "select", definingCategorySlug: "exhaust", nameKa: "მასალა", optionKey: "ALUMINUM" },
    ],
    variants: [{ price: 310, stockQuantity: 3, sku: "EXH-HEADER-001" }],
  },
];

async function seedFitmentVehicle() {
  const motorcyclesCatId = await categoryId("motorcycles");

  const brand = await prisma.brand.upsert({
    where: { slug: "yamaha" },
    update: {},
    create: { slug: "yamaha", nameKa: "იამაჰა", nameEn: "Yamaha", nameRu: "Ямаха" },
  });

  const model = await prisma.model.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: "mt-07" } },
    update: {},
    create: {
      brandId: brand.id,
      categoryId: motorcyclesCatId,
      slug: "mt-07",
      nameKa: "MT-07",
      nameEn: "MT-07",
      nameRu: "MT-07",
    },
  });

  const vehicle = await prisma.vehicleCatalog.upsert({
    where: {
      modelId_variant_yearFrom_yearTo: { modelId: model.id, variant: "", yearFrom: 2018, yearTo: 2024 },
    },
    update: {},
    create: { brandId: brand.id, modelId: model.id, variant: "", yearFrom: 2018, yearTo: 2024 },
  });

  return { "yamaha-mt-07": vehicle.id } as Record<string, number>;
}

async function resolveAttributeValueData(attr: AttrValueSeed) {
  switch (attr.kind) {
    case "select":
      return {
        attributeId: await attributeId(attr.definingCategorySlug, attr.nameKa),
        optionId: await optionId(attr.definingCategorySlug, attr.nameKa, attr.optionKey),
      };
    case "number":
      return {
        attributeId: await attributeId(attr.definingCategorySlug, attr.nameKa),
        valueNumber: attr.value,
      };
    case "boolean":
      return {
        attributeId: await attributeId(attr.definingCategorySlug, attr.nameKa),
        valueBoolean: attr.value,
      };
    case "text":
      return {
        attributeId: await attributeId(attr.definingCategorySlug, attr.nameKa),
        valueText: attr.value,
      };
  }
}

async function seedProduct(seed: ProductSeed, vehicleIdBySlug: Record<string, number>) {
  const existing = await prisma.product.findUnique({ where: { slug: seed.slug } });
  if (existing) {
    console.log(`Product already exists, skipping: ${seed.slug}`);
    return;
  }

  const catId = await categoryId(seed.categorySlug);
  const productBrandId = seed.brandSlug ? await brandId(seed.brandSlug) : null;
  const conditionNewId = await lookupId(prisma.condition, "NEW");
  const statusAvailableId = await lookupId(prisma.listingStatus, "AVAILABLE");

  const product = await prisma.product.create({
    data: {
      categoryId: catId,
      productBrandId,
      nameKa: seed.nameKa,
      nameEn: seed.nameEn,
      nameRu: seed.nameRu,
      descriptionKa: seed.descriptionKa,
      descriptionEn: seed.descriptionEn,
      descriptionRu: seed.descriptionRu,
      slug: seed.slug,
      metaTitle: `${seed.nameKa} | ${SITE_NAME}`,
      metaDescription: seed.nameKa,
    },
  });

  for (const attr of seed.attributes) {
    const data = await resolveAttributeValueData(attr);
    await prisma.productAttributeValue.create({ data: { productId: product.id, ...data } });
  }

  const createdVariants = [];
  for (const variant of seed.variants) {
    const created = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sizeId: variant.sizeKey ? await lookupId(prisma.size, variant.sizeKey) : null,
        colorId: variant.colorKey ? await lookupId(prisma.color, variant.colorKey) : null,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
        sku: variant.sku,
        conditionId: conditionNewId,
        statusId: statusAvailableId,
        isActive: true,
      },
    });
    createdVariants.push({ id: created.id, price: variant.price });
  }

  if (seed.discountPercent && seed.discountDays && createdVariants.length > 0) {
    const startDate = new Date();
    const endDate = new Date(Date.now() + seed.discountDays * 24 * 60 * 60 * 1000);
    for (const variant of createdVariants) {
      const discountPrice = Math.round(variant.price * (1 - seed.discountPercent / 100) * 100) / 100;
      await prisma.productVariantDiscount.create({
        data: {
          productVariantId: variant.id,
          discountPrice,
          discountPercent: seed.discountPercent,
          startDate,
          endDate,
        },
      });
    }
  }

  if (seed.fitmentVehicleSlug) {
    const vehicleCatalogId = vehicleIdBySlug[seed.fitmentVehicleSlug];
    if (!vehicleCatalogId) throw new Error(`Unknown fitment vehicle slug: ${seed.fitmentVehicleSlug}`);
    await prisma.productFitment.create({ data: { productId: product.id, vehicleCatalogId } });
  }

  console.log(`Created product: ${seed.slug} (${createdVariants.length} variant(s))`);
}

async function main() {
  const vehicleIdBySlug = await seedFitmentVehicle();

  for (const seed of PRODUCTS) {
    await seedProduct(seed, vehicleIdBySlug);
  }

  console.log(`Done. ${PRODUCTS.length} product(s) defined.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
