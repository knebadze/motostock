import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/lib/roles.js";
import { USE_CLOUD_STORAGE_KEY } from "../src/modules/settings/settings.service.js";
import { processImageForDisk } from "../src/lib/image-processing.js";

// Source images for seed data live here (git-tracked), named after the
// entity's slug (e.g. "helmets.jpg"). They get resized/re-encoded the same
// way a real admin upload would and written into the (gitignored) uploads/
// folder — a category only gets an imageUrl if a matching file exists here.
const SEED_ASSETS_ROOT = path.resolve("prisma/seed-assets");
const SEED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function seedImageUrl(subfolder: string, slug: string): Promise<string | undefined> {
  const dir = path.join(SEED_ASSETS_ROOT, subfolder);
  const sourcePath = SEED_IMAGE_EXTENSIONS.map((ext) => path.join(dir, `${slug}${ext}`)).find(
    (candidate) => fs.existsSync(candidate),
  );
  if (!sourcePath) return undefined;

  const mimetype = MIME_BY_EXTENSION[path.extname(sourcePath)];
  const { buffer, extension } = await processImageForDisk(fs.readFileSync(sourcePath), mimetype);

  const uploadDir = path.resolve("uploads", subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `seed-${slug}${extension}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";

type LookupEntry = { key: string; nameKa: string; nameEn: string; nameRu: string };

type LookupDelegate = {
  upsert: (args: {
    where: { key: string };
    update: Record<string, never>;
    create: LookupEntry;
  }) => Promise<unknown>;
};

async function seedLookup(label: string, delegate: LookupDelegate, entries: LookupEntry[]) {
  for (const entry of entries) {
    await delegate.upsert({ where: { key: entry.key }, update: {}, create: entry });
  }
  console.log(`${label} ready: ${entries.map((entry) => entry.key).join(", ")}`);
}

const FUEL_TYPES: LookupEntry[] = [
  { key: "PETROL", nameKa: "ბენზინი", nameEn: "Petrol", nameRu: "Бензин" },
  { key: "ELECTRIC", nameKa: "ელექტრო", nameEn: "Electric", nameRu: "Электро" },
];

const TRANSMISSION_TYPES: LookupEntry[] = [
  { key: "MANUAL", nameKa: "მექანიკური", nameEn: "Manual", nameRu: "Механическая" },
  { key: "AUTOMATIC", nameKa: "ავტომატური", nameEn: "Automatic", nameRu: "Автоматическая" },
  { key: "CVT", nameKa: "ვარიატორი", nameEn: "CVT", nameRu: "Вариатор" },
  {
    key: "SEMI_AUTOMATIC",
    nameKa: "ნახევრად-ავტომატური",
    nameEn: "Semi-automatic",
    nameRu: "Полуавтоматическая",
  },
];

const COOLING_TYPES: LookupEntry[] = [
  { key: "AIR", nameKa: "საჰაერო გაგრილება", nameEn: "Air-cooled", nameRu: "Воздушное охлаждение" },
  {
    key: "LIQUID",
    nameKa: "სითხური გაგრილება",
    nameEn: "Liquid-cooled",
    nameRu: "Жидкостное охлаждение",
  },
  { key: "OIL", nameKa: "ზეთის გაგრილება", nameEn: "Oil-cooled", nameRu: "Масляное охлаждение" },
];

const FINAL_DRIVE_TYPES: LookupEntry[] = [
  { key: "CHAIN", nameKa: "ჯაჭვი", nameEn: "Chain", nameRu: "Цепь" },
  { key: "BELT", nameKa: "ღვედი", nameEn: "Belt", nameRu: "Ремень" },
  { key: "SHAFT", nameKa: "კარდანი", nameEn: "Shaft", nameRu: "Кардан" },
];

const DRIVE_TYPES: LookupEntry[] = [
  {
    key: "TWO_WD",
    nameKa: "უკანა წამყვანი (2WD)",
    nameEn: "Rear-wheel drive (2WD)",
    nameRu: "Задний привод (2WD)",
  },
  {
    key: "FOUR_WD",
    nameKa: "სრული წამყვანი (4WD)",
    nameEn: "All-wheel drive (4WD)",
    nameRu: "Полный привод (4WD)",
  },
];

const START_TYPES: LookupEntry[] = [
  { key: "ELECTRIC", nameKa: "ელექტრო სტარტერი", nameEn: "Electric starter", nameRu: "Электростартер" },
  { key: "KICK", nameKa: "კიკ-სტარტერი", nameEn: "Kick starter", nameRu: "Кикстартер" },
  { key: "BOTH", nameKa: "ორივე", nameEn: "Both", nameRu: "Оба" },
];

const POWERTRAIN_TYPES: LookupEntry[] = [
  { key: "COMBUSTION", nameKa: "წვის ძრავი", nameEn: "Combustion engine", nameRu: "Двигатель внутреннего сгорания" },
  { key: "ELECTRIC", nameKa: "ელექტრო ძრავი", nameEn: "Electric motor", nameRu: "Электродвигатель" },
];

const CONDITIONS: LookupEntry[] = [
  { key: "NEW", nameKa: "ახალი", nameEn: "New", nameRu: "Новый" },
  { key: "USED", nameKa: "მეორადი", nameEn: "Used", nameRu: "Б/у" },
];

const LISTING_STATUSES: LookupEntry[] = [
  { key: "AVAILABLE", nameKa: "ხელმისაწვდომია", nameEn: "Available", nameRu: "В наличии" },
  { key: "RESERVED", nameKa: "დაჯავშნილია", nameEn: "Reserved", nameRu: "Забронировано" },
  { key: "SOLD", nameKa: "გაყიდულია", nameEn: "Sold", nameRu: "Продано" },
];

const COLORS: LookupEntry[] = [
  { key: "BLACK", nameKa: "შავი", nameEn: "Black", nameRu: "Черный" },
  { key: "WHITE", nameKa: "თეთრი", nameEn: "White", nameRu: "Белый" },
  { key: "RED", nameKa: "წითელი", nameEn: "Red", nameRu: "Красный" },
  { key: "BLUE", nameKa: "ლურჯი", nameEn: "Blue", nameRu: "Синий" },
  { key: "GREEN", nameKa: "მწვანე", nameEn: "Green", nameRu: "Зеленый" },
  { key: "YELLOW", nameKa: "ყვითელი", nameEn: "Yellow", nameRu: "Желтый" },
  { key: "ORANGE", nameKa: "ნარინჯისფერი", nameEn: "Orange", nameRu: "Оранжевый" },
  { key: "GRAY", nameKa: "ნაცრისფერი", nameEn: "Gray", nameRu: "Серый" },
  { key: "SILVER", nameKa: "ვერცხლისფერი", nameEn: "Silver", nameRu: "Серебристый" },
];

const SIZES: LookupEntry[] = [
  { key: "XS", nameKa: "XS", nameEn: "XS", nameRu: "XS" },
  { key: "S", nameKa: "S", nameEn: "S", nameRu: "S" },
  { key: "M", nameKa: "M", nameEn: "M", nameRu: "M" },
  { key: "L", nameKa: "L", nameEn: "L", nameRu: "L" },
  { key: "XL", nameKa: "XL", nameEn: "XL", nameRu: "XL" },
  { key: "XXL", nameKa: "XXL", nameEn: "XXL", nameRu: "XXL" },
  { key: "XXXL", nameKa: "XXXL", nameEn: "XXXL", nameRu: "XXXL" },
];

type CategorySeed = {
  slug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  children?: CategorySeed[];
};

// Starter category tree for the non-vehicle product lines (accessories/gear/
// parts). Purely a practical starting point — the admin can freely
// restructure this tree later (split/merge/rename/move branches) since
// nothing in the schema hardcodes this shape.
const PRODUCT_CATEGORY_TREE: CategorySeed[] = [
  {
    slug: "gear",
    nameKa: "ეკიპირება",
    nameEn: "Gear",
    nameRu: "Экипировка",
    children: [
      { slug: "jackets", nameKa: "ქურთუკები", nameEn: "Jackets", nameRu: "Куртки" },
      { slug: "gloves", nameKa: "ხელთათმანები", nameEn: "Gloves", nameRu: "Перчатки" },
      { slug: "boots", nameKa: "ჩექმები", nameEn: "Boots", nameRu: "Ботинки" },
      { slug: "protection", nameKa: "დამცავები", nameEn: "Protection", nameRu: "Защита" },
      { slug: "rain-gear", nameKa: "წვიმის ეკიპირება", nameEn: "Rain Gear", nameRu: "Дождевая экипировка" },
    ],
  },
  {
    slug: "helmets",
    nameKa: "ჩაფხუტები",
    nameEn: "Helmets",
    nameRu: "Шлемы",
    children: [
      { slug: "helmet-enduro", nameKa: "ენდურო", nameEn: "Enduro", nameRu: "Эндуро" },
      { slug: "helmet-full-face", nameKa: "დახურული", nameEn: "Full-Face", nameRu: "Закрытый" },
      { slug: "helmet-open-face", nameKa: "ღია", nameEn: "Open-Face", nameRu: "Открытый" },
      { slug: "helmet-modular", nameKa: "მოდულარული ჩაფხუტი", nameEn: "Modular Helmet", nameRu: "Модульный шлем" },
      { slug: "helmet-visor", nameKa: "ვიზორი", nameEn: "Visor", nameRu: "Визор" },
    ],
  },
  {
    slug: "transport",
    nameKa: "ტრანსპორტი",
    nameEn: "Transport",
    nameRu: "Транспорт",
    children: [
      {
        slug: "motorcycles",
        nameKa: "მოტოციკლი",
        nameEn: "Motorcycle",
        nameRu: "Мотоцикл",
        children: [
          { slug: "moto-naked", nameKa: "ქუჩის/სტანდარტული", nameEn: "Naked / Standard", nameRu: "Naked / Стандарт" },
          { slug: "moto-sportbike", nameKa: "სპორტული", nameEn: "Sportbike", nameRu: "Спортбайк" },
          { slug: "moto-cruiser", nameKa: "კრუიზერი", nameEn: "Cruiser", nameRu: "Круизер" },
          { slug: "moto-touring", nameKa: "ტურისტული/ტურერი", nameEn: "Touring", nameRu: "Турер" },
          { slug: "moto-adventure", nameKa: "სათავგადასავლო/ადვენჩერი", nameEn: "Adventure / ADV", nameRu: "Адвенчер" },
          { slug: "moto-dual-sport", nameKa: "დუალური დანიშნულების", nameEn: "Dual-Sport", nameRu: "Дуал-спорт" },
          { slug: "moto-enduro", nameKa: "ენდურო/ოფროუდი", nameEn: "Enduro / Dirt Bike", nameRu: "Эндуро" },
          { slug: "moto-supermoto", nameKa: "სუპერმოტო", nameEn: "Supermoto", nameRu: "Супермото" },
          { slug: "moto-cafe-racer", nameKa: "კაფე რეისერი/ნეო-რეტრო", nameEn: "Café Racer / Neo-Retro", nameRu: "Кафе-рейсер / Нео-ретро" },
          { slug: "moto-bobber", nameKa: "ბობერი/ჩოპერი", nameEn: "Bobber / Chopper", nameRu: "Бобер / Чоппер" },
          { slug: "moto-sport-touring", nameKa: "სპორტ-ტურერი", nameEn: "Sport-Touring", nameRu: "Спорт-турер" },
        ],
      },
      { slug: "atvs", nameKa: "კვადროციკლი", nameEn: "ATV", nameRu: "Квадроцикл" },
      { slug: "scooters", nameKa: "სკუტერი", nameEn: "Scooter", nameRu: "Скутер" },
      { slug: "kick-scooters", nameKa: "სქროლი", nameEn: "Kick Scooter", nameRu: "Самокат" },
    ],
  },
  {
    slug: "accessories",
    nameKa: "აქსესუარები",
    nameEn: "Accessories",
    nameRu: "Аксессуары",
    children: [
      { slug: "luggage", nameKa: "ბარგი", nameEn: "Luggage", nameRu: "Багаж" },
      { slug: "electronics", nameKa: "ელექტრონიკა", nameEn: "Electronics", nameRu: "Электроника" },
      { slug: "security", nameKa: "უსაფრთხოება", nameEn: "Security", nameRu: "Безопасность" },
    ],
  },
  {
    slug: "parts",
    nameKa: "ნაწილები",
    nameEn: "Parts",
    nameRu: "Запчасти",
    children: [
      { slug: "brakes", nameKa: "სამუხრუჭე სისტემა", nameEn: "Brakes", nameRu: "Тормозная система" },
      { slug: "batteries", nameKa: "აკუმულატორები", nameEn: "Batteries", nameRu: "Аккумуляторы" },
      { slug: "tires", nameKa: "საბურავები", nameEn: "Tires", nameRu: "Шины" },
      { slug: "filters", nameKa: "ფილტრები", nameEn: "Filters", nameRu: "Фильтры" },
      { slug: "fluids", nameKa: "ზეთები და სითხეები", nameEn: "Oils & Fluids", nameRu: "Масла и жидкости" },
      { slug: "exhaust", nameKa: "გამონაბოლქვის სისტემა", nameEn: "Exhaust", nameRu: "Выхлопная система" },
    ],
  },
];

async function seedCategoryTree(
  nodes: CategorySeed[],
  parentId: number | null,
  idBySlug: Map<string, number> = new Map(),
) {
  for (const node of nodes) {
    // Backfill a seed image only when the category doesn't already have one —
    // re-running the seed must never clobber an image an admin uploaded/changed by hand.
    const existing = await prisma.category.findUnique({ where: { slug: node.slug } });
    const imageUrl = existing?.imageUrl ? undefined : await seedImageUrl("categories", node.slug);

    const category = await prisma.category.upsert({
      where: { slug: node.slug },
      update: { ...(imageUrl ? { imageUrl } : {}) },
      create: {
        slug: node.slug,
        nameKa: node.nameKa,
        nameEn: node.nameEn,
        nameRu: node.nameRu,
        parentId,
        ...(imageUrl ? { imageUrl } : {}),
      },
    });
    idBySlug.set(node.slug, category.id);
    if (node.children) {
      await seedCategoryTree(node.children, category.id, idBySlug);
    }
  }
  return idBySlug;
}

type AttributeOptionSeed = { key: string; labelKa: string; labelEn: string; labelRu: string };
type AttributeSeed = {
  categorySlug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
  required?: boolean;
  options?: AttributeOptionSeed[];
};

// A practical starting set grounded in how RevZilla/Cycle Gear/MotoSport
// structure these attributes — not exhaustive. More can be added later
// through the Attributes admin UI without any code change.
const ATTRIBUTE_SEEDS: AttributeSeed[] = [
  {
    categorySlug: "gear",
    nameKa: "მასალა",
    nameEn: "Material",
    nameRu: "Материал",
    valueType: "SELECT",
    options: [
      { key: "LEATHER", labelKa: "ტყავი", labelEn: "Leather", labelRu: "Кожа" },
      { key: "TEXTILE", labelKa: "ტექსტილი", labelEn: "Textile", labelRu: "Текстиль" },
      { key: "MESH", labelKa: "mesh", labelEn: "Mesh", labelRu: "Сетка" },
      { key: "DENIM", labelKa: "ჯინსი", labelEn: "Denim", labelRu: "Деним" },
    ],
  },
  {
    categorySlug: "gear",
    nameKa: "სეზონი",
    nameEn: "Season",
    nameRu: "Сезон",
    valueType: "SELECT",
    options: [
      { key: "SUMMER", labelKa: "ზაფხული", labelEn: "Summer", labelRu: "Лето" },
      { key: "WINTER", labelKa: "ზამთარი", labelEn: "Winter", labelRu: "Зима" },
      { key: "ALL_SEASON", labelKa: "ოთხ-სეზონური", labelEn: "All-season", labelRu: "Всесезонный" },
    ],
  },
  {
    categorySlug: "gear",
    nameKa: "წყალგამძლეობა",
    nameEn: "Waterproof",
    nameRu: "Водонепроницаемость",
    valueType: "BOOLEAN",
  },
  {
    categorySlug: "helmets",
    nameKa: "გარსის მასალა",
    nameEn: "Shell Material",
    nameRu: "Материал скорлупы",
    valueType: "SELECT",
    options: [
      { key: "ABS", labelKa: "ABS", labelEn: "ABS", labelRu: "ABS" },
      { key: "FIBERGLASS", labelKa: "ფაიბერგლასი", labelEn: "Fiberglass", labelRu: "Стекловолокно" },
      { key: "CARBON", labelKa: "კარბონი", labelEn: "Carbon", labelRu: "Карбон" },
      { key: "POLYCARBONATE", labelKa: "პოლიკარბონატი", labelEn: "Polycarbonate", labelRu: "Поликарбонат" },
    ],
  },
  {
    categorySlug: "helmets",
    nameKa: "უსაფრთხოების სერტიფიკატი",
    nameEn: "Safety Certification",
    nameRu: "Сертификат безопасности",
    valueType: "SELECT",
    required: true,
    options: [
      { key: "DOT", labelKa: "DOT", labelEn: "DOT", labelRu: "DOT" },
      { key: "ECE", labelKa: "ECE 22.05/22.06", labelEn: "ECE 22.05/22.06", labelRu: "ECE 22.05/22.06" },
      { key: "SNELL", labelKa: "SNELL", labelEn: "SNELL", labelRu: "SNELL" },
    ],
  },
  {
    categorySlug: "helmets",
    nameKa: "წონა",
    nameEn: "Weight",
    nameRu: "Вес",
    valueType: "NUMBER",
  },
  {
    categorySlug: "jackets",
    nameKa: "დამცავის CE დონე",
    nameEn: "Armor CE Level",
    nameRu: "Уровень защиты CE",
    valueType: "SELECT",
    options: [
      { key: "NONE", labelKa: "არცერთი", labelEn: "None", labelRu: "Нет" },
      { key: "CE1", labelKa: "CE Level 1", labelEn: "CE Level 1", labelRu: "CE Level 1" },
      { key: "CE2", labelKa: "CE Level 2", labelEn: "CE Level 2", labelRu: "CE Level 2" },
    ],
  },
  {
    categorySlug: "gloves",
    nameKa: "სამაჯურის ტიპი",
    nameEn: "Cuff Type",
    nameRu: "Тип манжеты",
    valueType: "SELECT",
    options: [
      { key: "GAUNTLET", labelKa: "Gauntlet", labelEn: "Gauntlet", labelRu: "Крага" },
      { key: "SHORT_CUFF", labelKa: "Short Cuff", labelEn: "Short Cuff", labelRu: "Короткая манжета" },
      { key: "FINGERLESS", labelKa: "უთითო", labelEn: "Fingerless", labelRu: "Без пальцев" },
    ],
  },
  {
    categorySlug: "gloves",
    nameKa: "სახსრის დაცვა",
    nameEn: "Knuckle Protection",
    nameRu: "Защита костяшек",
    valueType: "BOOLEAN",
  },
  {
    categorySlug: "boots",
    nameKa: "სიმაღლე",
    nameEn: "Height",
    nameRu: "Высота",
    valueType: "SELECT",
    options: [
      { key: "SHORT", labelKa: "მოკლე", labelEn: "Short", labelRu: "Короткий" },
      { key: "MEDIUM", labelKa: "საშუალო", labelEn: "Medium", labelRu: "Средний" },
      { key: "TALL", labelKa: "მაღალი", labelEn: "Tall", labelRu: "Высокий" },
    ],
  },
  {
    categorySlug: "luggage",
    nameKa: "მოცულობა (ლ)",
    nameEn: "Capacity (L)",
    nameRu: "Объем (л)",
    valueType: "NUMBER",
  },
  {
    categorySlug: "luggage",
    nameKa: "წყალგამძლეობა",
    nameEn: "Waterproof",
    nameRu: "Водонепроницаемость",
    valueType: "BOOLEAN",
  },
  {
    categorySlug: "parts",
    nameKa: "წარმოშობა",
    nameEn: "Origin",
    nameRu: "Происхождение",
    valueType: "SELECT",
    required: true,
    options: [
      { key: "OEM", labelKa: "OEM", labelEn: "OEM", labelRu: "OEM" },
      { key: "AFTERMARKET", labelKa: "Aftermarket", labelEn: "Aftermarket", labelRu: "Неоригинал" },
    ],
  },
  {
    categorySlug: "brakes",
    nameKa: "მასალა/კომპაუნდი",
    nameEn: "Material/Compound",
    nameRu: "Материал/Компаунд",
    valueType: "SELECT",
    options: [
      { key: "SINTERED", labelKa: "სინტერული", labelEn: "Sintered", labelRu: "Спечённый" },
      { key: "ORGANIC", labelKa: "ორგანული", labelEn: "Organic", labelRu: "Органический" },
      { key: "CERAMIC", labelKa: "კერამიკული", labelEn: "Ceramic", labelRu: "Керамический" },
    ],
  },
  {
    categorySlug: "batteries",
    nameKa: "ტიპი",
    nameEn: "Type",
    nameRu: "Тип",
    valueType: "SELECT",
    options: [
      { key: "LEAD_ACID", labelKa: "ტყვია-მჟავა", labelEn: "Lead-acid", labelRu: "Свинцово-кислотный" },
      { key: "AGM", labelKa: "AGM", labelEn: "AGM", labelRu: "AGM" },
      { key: "LITHIUM", labelKa: "ლითიუმი (LiFePO4)", labelEn: "Lithium (LiFePO4)", labelRu: "Литий (LiFePO4)" },
    ],
  },
  {
    categorySlug: "batteries",
    nameKa: "ტევადობა (Ah)",
    nameEn: "Capacity (Ah)",
    nameRu: "Емкость (Ач)",
    valueType: "NUMBER",
  },
  {
    categorySlug: "tires",
    nameKa: "ზომა",
    nameEn: "Size",
    nameRu: "Размер",
    valueType: "TEXT",
    required: true,
  },
  {
    categorySlug: "tires",
    nameKa: "კონსტრუქცია",
    nameEn: "Construction",
    nameRu: "Конструкция",
    valueType: "SELECT",
    options: [
      { key: "RADIAL", labelKa: "რადიალური", labelEn: "Radial", labelRu: "Радиальная" },
      { key: "BIAS", labelKa: "დიაგონალური", labelEn: "Bias", labelRu: "Диагональная" },
    ],
  },
  {
    categorySlug: "exhaust",
    nameKa: "ტიპი",
    nameEn: "Type",
    nameRu: "Тип",
    valueType: "SELECT",
    options: [
      { key: "SLIP_ON", labelKa: "Slip-on", labelEn: "Slip-on", labelRu: "Слип-он" },
      { key: "FULL_SYSTEM", labelKa: "Full System", labelEn: "Full System", labelRu: "Полная система" },
      { key: "HEADER", labelKa: "Header", labelEn: "Header", labelRu: "Header" },
    ],
  },
  {
    categorySlug: "exhaust",
    nameKa: "მასალა",
    nameEn: "Material",
    nameRu: "Материал",
    valueType: "SELECT",
    options: [
      { key: "STAINLESS_STEEL", labelKa: "უჟანგავი ფოლადი", labelEn: "Stainless Steel", labelRu: "Нержавеющая сталь" },
      { key: "TITANIUM", labelKa: "ტიტანი", labelEn: "Titanium", labelRu: "Титан" },
      { key: "CARBON", labelKa: "კარბონი", labelEn: "Carbon", labelRu: "Карбон" },
      { key: "ALUMINUM", labelKa: "ალუმინი", labelEn: "Aluminum", labelRu: "Алюминий" },
    ],
  },
];

async function seedAttributes(categoryIdBySlug: Map<string, number>) {
  for (const attributeSeed of ATTRIBUTE_SEEDS) {
    const categoryId = categoryIdBySlug.get(attributeSeed.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category slug in attribute seed: ${attributeSeed.categorySlug}`);
    }

    let attribute = await prisma.attribute.findFirst({
      where: { categoryId, nameKa: attributeSeed.nameKa },
    });
    if (!attribute) {
      attribute = await prisma.attribute.create({
        data: {
          categoryId,
          nameKa: attributeSeed.nameKa,
          nameEn: attributeSeed.nameEn,
          nameRu: attributeSeed.nameRu,
          valueType: attributeSeed.valueType,
          required: attributeSeed.required ?? false,
        },
      });
    }

    for (const option of attributeSeed.options ?? []) {
      await prisma.attributeOption.upsert({
        where: { attributeId_key: { attributeId: attribute.id, key: option.key } },
        update: {},
        create: {
          attributeId: attribute.id,
          key: option.key,
          labelKa: option.labelKa,
          labelEn: option.labelEn,
          labelRu: option.labelRu,
        },
      });
    }
  }
  console.log(`Attributes ready: ${ATTRIBUTE_SEEDS.length}`);
}

type ProductBrandSeed = {
  categorySlug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
};

// Brands are attached at whichever category level actually matches how the
// brand sells — a few (Alpinestars, Givi) make gear/accessories broadly and
// are attached at the parent so every subcategory inherits them, while
// single-purpose brands (AGV for helmets, Motul for fluids) are attached
// directly to their leaf category.
const PRODUCT_BRAND_SEEDS: ProductBrandSeed[] = [
  { categorySlug: "gear", nameKa: "Alpinestars", nameEn: "Alpinestars", nameRu: "Alpinestars", slug: "alpinestars" },
  { categorySlug: "gear", nameKa: "Dainese", nameEn: "Dainese", nameRu: "Dainese", slug: "dainese" },
  { categorySlug: "gear", nameKa: "REV'IT!", nameEn: "REV'IT!", nameRu: "REV'IT!", slug: "revit" },
  { categorySlug: "helmets", nameKa: "AGV", nameEn: "AGV", nameRu: "AGV", slug: "agv" },
  { categorySlug: "helmets", nameKa: "Shoei", nameEn: "Shoei", nameRu: "Shoei", slug: "shoei" },
  { categorySlug: "helmets", nameKa: "Arai", nameEn: "Arai", nameRu: "Arai", slug: "arai" },
  { categorySlug: "accessories", nameKa: "Givi", nameEn: "Givi", nameRu: "Givi", slug: "givi" },
  { categorySlug: "accessories", nameKa: "SW-Motech", nameEn: "SW-Motech", nameRu: "SW-Motech", slug: "sw-motech" },
  { categorySlug: "security", nameKa: "Xena", nameEn: "Xena", nameRu: "Xena", slug: "xena" },
  { categorySlug: "tires", nameKa: "Michelin", nameEn: "Michelin", nameRu: "Michelin", slug: "michelin" },
  { categorySlug: "tires", nameKa: "Pirelli", nameEn: "Pirelli", nameRu: "Pirelli", slug: "pirelli" },
  { categorySlug: "tires", nameKa: "Dunlop", nameEn: "Dunlop", nameRu: "Dunlop", slug: "dunlop" },
  { categorySlug: "fluids", nameKa: "Motul", nameEn: "Motul", nameRu: "Motul", slug: "motul" },
  { categorySlug: "fluids", nameKa: "Castrol", nameEn: "Castrol", nameRu: "Castrol", slug: "castrol" },
  { categorySlug: "brakes", nameKa: "Brembo", nameEn: "Brembo", nameRu: "Brembo", slug: "brembo" },
  { categorySlug: "batteries", nameKa: "Yuasa", nameEn: "Yuasa", nameRu: "Yuasa", slug: "yuasa" },
];

async function seedProductBrands(categoryIdBySlug: Map<string, number>) {
  for (const brandSeed of PRODUCT_BRAND_SEEDS) {
    const categoryId = categoryIdBySlug.get(brandSeed.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category slug in product brand seed: ${brandSeed.categorySlug}`);
    }

    await prisma.productBrand.upsert({
      where: { slug: brandSeed.slug },
      update: {},
      create: {
        categoryId,
        nameKa: brandSeed.nameKa,
        nameEn: brandSeed.nameEn,
        nameRu: brandSeed.nameRu,
        slug: brandSeed.slug,
      },
    });
  }
  console.log(`Product brands ready: ${PRODUCT_BRAND_SEEDS.length}`);
}

type CategoryFilterSeed =
  | { categorySlug: string; filterType: "PRICE" | "BRAND"; sortOrder: number }
  | {
      categorySlug: string;
      filterType: "ATTRIBUTE";
      definingCategorySlug: string;
      attributeNameKa: string;
      sortOrder: number;
    };

// Demo filter-panel composition for a few categories — shows all three
// filter kinds (built-in Price/Brand plus SELECT/NUMBER/BOOLEAN attributes)
// so the shop's filter sidebar has something to render out of the box.
const CATEGORY_FILTER_SEEDS: CategoryFilterSeed[] = [
  { categorySlug: "helmets", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "helmets", filterType: "BRAND", sortOrder: 1 },
  {
    categorySlug: "helmets",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "helmets",
    attributeNameKa: "გარსის მასალა",
    sortOrder: 2,
  },
  {
    categorySlug: "helmets",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "helmets",
    attributeNameKa: "უსაფრთხოების სერტიფიკატი",
    sortOrder: 3,
  },
  { categorySlug: "gear", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "gear", filterType: "BRAND", sortOrder: 1 },
  {
    categorySlug: "gear",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "gear",
    attributeNameKa: "მასალა",
    sortOrder: 2,
  },
  {
    categorySlug: "gear",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "gear",
    attributeNameKa: "სეზონი",
    sortOrder: 3,
  },
  {
    categorySlug: "gear",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "gear",
    attributeNameKa: "წყალგამძლეობა",
    sortOrder: 4,
  },
  { categorySlug: "tires", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "tires", filterType: "BRAND", sortOrder: 1 },
  {
    categorySlug: "tires",
    filterType: "ATTRIBUTE",
    definingCategorySlug: "tires",
    attributeNameKa: "კონსტრუქცია",
    sortOrder: 2,
  },
];

async function seedCategoryFilters(categoryIdBySlug: Map<string, number>) {
  for (const filterSeed of CATEGORY_FILTER_SEEDS) {
    const categoryId = categoryIdBySlug.get(filterSeed.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category slug in category filter seed: ${filterSeed.categorySlug}`);
    }

    if (filterSeed.filterType === "ATTRIBUTE") {
      const definingCategoryId = categoryIdBySlug.get(filterSeed.definingCategorySlug);
      if (!definingCategoryId) {
        throw new Error(
          `Unknown defining category slug in category filter seed: ${filterSeed.definingCategorySlug}`,
        );
      }

      const attribute = await prisma.attribute.findFirst({
        where: { categoryId: definingCategoryId, nameKa: filterSeed.attributeNameKa },
      });
      if (!attribute) {
        throw new Error(`Unknown attribute in category filter seed: ${filterSeed.attributeNameKa}`);
      }

      const existing = await prisma.categoryFilterConfig.findFirst({
        where: { categoryId, attributeId: attribute.id },
      });
      if (existing) {
        await prisma.categoryFilterConfig.update({
          where: { id: existing.id },
          data: { sortOrder: filterSeed.sortOrder },
        });
      } else {
        await prisma.categoryFilterConfig.create({
          data: {
            categoryId,
            filterType: "ATTRIBUTE",
            attributeId: attribute.id,
            sortOrder: filterSeed.sortOrder,
          },
        });
      }
      continue;
    }

    const existing = await prisma.categoryFilterConfig.findFirst({
      where: { categoryId, filterType: filterSeed.filterType },
    });
    if (existing) {
      await prisma.categoryFilterConfig.update({
        where: { id: existing.id },
        data: { sortOrder: filterSeed.sortOrder },
      });
    } else {
      await prisma.categoryFilterConfig.create({
        data: { categoryId, filterType: filterSeed.filterType, sortOrder: filterSeed.sortOrder },
      });
    }
  }
  console.log(`Category filters ready: ${CATEGORY_FILTER_SEEDS.length}`);
}

async function main() {
  const userRole = await prisma.role.upsert({
    where: { name: ROLES.USER },
    update: {},
    create: { name: ROLES.USER },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: ROLES.ADMIN },
    update: {},
    create: { name: ROLES.ADMIN },
  });

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        roleId: adminRole.id,
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log(`Roles ready: ${userRole.name}, ${adminRole.name}`);

  await prisma.setting.upsert({
    where: { key: USE_CLOUD_STORAGE_KEY },
    update: {},
    create: { key: USE_CLOUD_STORAGE_KEY, value: "false" },
  });
  console.log(`Setting ready: ${USE_CLOUD_STORAGE_KEY}`);

  await seedLookup("Fuel types", prisma.fuelType, FUEL_TYPES);
  await seedLookup("Transmission types", prisma.transmissionType, TRANSMISSION_TYPES);
  await seedLookup("Cooling types", prisma.coolingType, COOLING_TYPES);
  await seedLookup("Final drive types", prisma.finalDriveType, FINAL_DRIVE_TYPES);
  await seedLookup("Drive types", prisma.driveType, DRIVE_TYPES);
  await seedLookup("Start types", prisma.startType, START_TYPES);
  await seedLookup("Powertrain types", prisma.powertrainType, POWERTRAIN_TYPES);
  await seedLookup("Conditions", prisma.condition, CONDITIONS);
  await seedLookup("Listing statuses", prisma.listingStatus, LISTING_STATUSES);
  await seedLookup("Colors", prisma.color, COLORS);
  await seedLookup("Sizes", prisma.size, SIZES);

  const categoryIdBySlug = await seedCategoryTree(PRODUCT_CATEGORY_TREE, null);
  console.log(`Product category tree ready: ${categoryIdBySlug.size} categories`);

  await seedAttributes(categoryIdBySlug);
  await seedProductBrands(categoryIdBySlug);
  await seedCategoryFilters(categoryIdBySlug);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
