import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

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
      metaTitle: `${seed.nameKa} | MotoStock`,
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
