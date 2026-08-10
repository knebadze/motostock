import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/lib/roles.js";
import { USE_CLOUD_STORAGE_KEY } from "../src/modules/settings/settings.service.js";
import { processImageForDisk } from "../src/lib/image-processing.js";
import { listHomepageSections } from "../src/modules/homepage-sections/homepage-sections.service.js";

// Source images for seed data live here (git-tracked), named after the
// entity's slug (e.g. "helmets.jpg"). They get resized/re-encoded the same
// way a real admin upload would and written into the (gitignored) uploads/
// folder — a category only gets an imageUrl if a matching file exists here.
const SEED_ASSETS_ROOT = path.resolve("prisma/seed-assets");
const SEED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

async function seedImageUrl(subfolder: string, slug: string): Promise<string | undefined> {
  const dir = path.join(SEED_ASSETS_ROOT, subfolder);
  const sourcePath = SEED_IMAGE_EXTENSIONS.map((ext) => path.join(dir, `${slug}${ext}`)).find(
    (candidate) => fs.existsSync(candidate),
  );
  if (!sourcePath) return undefined;

  const { buffer, extension } = await processImageForDisk(fs.readFileSync(sourcePath));

  const uploadDir = path.resolve("uploads", subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `seed-${slug}${extension}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_FIRST_NAME = "Admin";
const ADMIN_LAST_NAME = "User";

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

// Intended lifecycle: PENDING -> CONFIRMED -> SHIPPED -> DELIVERED, with
// CANCELLED as an alternate terminal state (see order-status.prisma).
const ORDER_STATUSES: LookupEntry[] = [
  { key: "PENDING", nameKa: "მუშავდება", nameEn: "Processing", nameRu: "В обработке" },
  { key: "CONFIRMED", nameKa: "დადასტურებულია", nameEn: "Confirmed", nameRu: "Подтверждён" },
  { key: "SHIPPED", nameKa: "კურიერთანაა", nameEn: "Out for delivery", nameRu: "У курьера" },
  { key: "DELIVERED", nameKa: "ჩაბარებულია", nameEn: "Delivered", nameRu: "Доставлен" },
  { key: "CANCELLED", nameKa: "გაუქმებულია", nameEn: "Cancelled", nameRu: "Отменён" },
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

const CITIES: LookupEntry[] = [
  { key: "TBILISI", nameKa: "თბილისი", nameEn: "Tbilisi", nameRu: "Тбилиси" },
  { key: "BATUMI", nameKa: "ბათუმი", nameEn: "Batumi", nameRu: "Батуми" },
  { key: "KUTAISI", nameKa: "ქუთაისი", nameEn: "Kutaisi", nameRu: "Кутаиси" },
  { key: "RUSTAVI", nameKa: "რუსთავი", nameEn: "Rustavi", nameRu: "Рустави" },
  { key: "GORI", nameKa: "გორი", nameEn: "Gori", nameRu: "Гори" },
  { key: "ZUGDIDI", nameKa: "ზუგდიდი", nameEn: "Zugdidi", nameRu: "Зугдиди" },
  { key: "POTI", nameKa: "ფოთი", nameEn: "Poti", nameRu: "Поти" },
  { key: "KHASHURI", nameKa: "ხაშური", nameEn: "Khashuri", nameRu: "Хашури" },
  { key: "SAMTREDIA", nameKa: "სამტრედია", nameEn: "Samtredia", nameRu: "Самтредиа" },
  { key: "SENAKI", nameKa: "სენაკი", nameEn: "Senaki", nameRu: "Сенаки" },
  { key: "ZESTAPONI", nameKa: "ზესტაფონი", nameEn: "Zestaponi", nameRu: "Зестафони" },
  { key: "MARNEULI", nameKa: "მარნეული", nameEn: "Marneuli", nameRu: "Марнеули" },
  { key: "TELAVI", nameKa: "თელავი", nameEn: "Telavi", nameRu: "Телави" },
  { key: "AKHALTSIKHE", nameKa: "ახალციხე", nameEn: "Akhaltsikhe", nameRu: "Ахалцихе" },
  { key: "OZURGETI", nameKa: "ოზურგეთი", nameEn: "Ozurgeti", nameRu: "Озургети" },
  { key: "KOBULETI", nameKa: "ქობულეთი", nameEn: "Kobuleti", nameRu: "Кобулети" },
  { key: "AKHALKALAKI", nameKa: "ახალქალაქი", nameEn: "Akhalkalaki", nameRu: "Ахалкалаки" },
  { key: "GARDABANI", nameKa: "გარდაბანი", nameEn: "Gardabani", nameRu: "Гардабани" },
  { key: "BORJOMI", nameKa: "ბორჯომი", nameEn: "Borjomi", nameRu: "Боржоми" },
  { key: "MTSKHETA", nameKa: "მცხეთა", nameEn: "Mtskheta", nameRu: "Мцхета" },
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

type UnitSeed = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  abbreviationKa: string;
  abbreviationEn: string;
  abbreviationRu: string;
};

// Core units of measurement an attribute's value can be expressed in —
// covers length/weight/volume/battery capacity/percent, the units most
// product attributes across the seeded categories actually need. More can
// be added later through the Units admin UI without any code change.
const UNIT_SEEDS: UnitSeed[] = [
  { nameKa: "მილიმეტრი", nameEn: "Millimeter", nameRu: "Миллиметр", abbreviationKa: "მმ", abbreviationEn: "mm", abbreviationRu: "мм" },
  { nameKa: "სანტიმეტრი", nameEn: "Centimeter", nameRu: "Сантиметр", abbreviationKa: "სმ", abbreviationEn: "cm", abbreviationRu: "см" },
  { nameKa: "მეტრი", nameEn: "Meter", nameRu: "Метр", abbreviationKa: "მ", abbreviationEn: "m", abbreviationRu: "м" },
  { nameKa: "გრამი", nameEn: "Gram", nameRu: "Грамм", abbreviationKa: "გ", abbreviationEn: "g", abbreviationRu: "г" },
  { nameKa: "კილოგრამი", nameEn: "Kilogram", nameRu: "Килограмм", abbreviationKa: "კგ", abbreviationEn: "kg", abbreviationRu: "кг" },
  { nameKa: "მილილიტრი", nameEn: "Milliliter", nameRu: "Миллилитр", abbreviationKa: "მლ", abbreviationEn: "ml", abbreviationRu: "мл" },
  { nameKa: "ლიტრი", nameEn: "Liter", nameRu: "Литр", abbreviationKa: "ლ", abbreviationEn: "L", abbreviationRu: "л" },
  { nameKa: "ამპერ-საათი", nameEn: "Ampere-hour", nameRu: "Ампер-час", abbreviationKa: "Ah", abbreviationEn: "Ah", abbreviationRu: "Ач" },
  { nameKa: "პროცენტი", nameEn: "Percent", nameRu: "Процент", abbreviationKa: "%", abbreviationEn: "%", abbreviationRu: "%" },
];

async function seedUnits(): Promise<Map<string, number>> {
  const idByNameKa = new Map<string, number>();
  for (const unitSeed of UNIT_SEEDS) {
    let unit = await prisma.unit.findFirst({ where: { nameKa: unitSeed.nameKa } });
    if (!unit) {
      unit = await prisma.unit.create({
        data: {
          nameKa: unitSeed.nameKa,
          nameEn: unitSeed.nameEn,
          nameRu: unitSeed.nameRu,
          abbreviationKa: unitSeed.abbreviationKa,
          abbreviationEn: unitSeed.abbreviationEn,
          abbreviationRu: unitSeed.abbreviationRu,
        },
      });
    }
    idByNameKa.set(unitSeed.nameKa, unit.id);
  }
  console.log(`Units ready: ${UNIT_SEEDS.length}`);
  return idByNameKa;
}

type AttributeOptionSeed = { key: string; labelKa: string; labelEn: string; labelRu: string };
type AttributeSeed = {
  categorySlug: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";
  required?: boolean;
  unitNameKa?: string;
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
    unitNameKa: "გრამი",
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
    unitNameKa: "ლიტრი",
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
    unitNameKa: "ამპერ-საათი",
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

async function seedAttributes(categoryIdBySlug: Map<string, number>, unitIdByNameKa: Map<string, number>) {
  for (const attributeSeed of ATTRIBUTE_SEEDS) {
    const categoryId = categoryIdBySlug.get(attributeSeed.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category slug in attribute seed: ${attributeSeed.categorySlug}`);
    }

    const unitId = attributeSeed.unitNameKa ? unitIdByNameKa.get(attributeSeed.unitNameKa) : undefined;
    if (attributeSeed.unitNameKa && unitId === undefined) {
      throw new Error(`Unknown unit in attribute seed: ${attributeSeed.unitNameKa}`);
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
          unitId: unitId ?? null,
        },
      });
    } else if (unitId != null && attribute.unitId == null) {
      // Backfill on re-seed — never overwrite a unit an admin may have
      // deliberately changed/cleared by hand.
      attribute = await prisma.attribute.update({ where: { id: attribute.id }, data: { unitId } });
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

type VehicleCategoryFilterSeed =
  | { categorySlug: string; filterType: "PRICE" | "YEAR" | "BRAND"; sortOrder: number }
  | {
      categorySlug: string;
      filterType: "SPEC";
      specField:
        | "FUEL_TYPE"
        | "TRANSMISSION_TYPE"
        | "DRIVE_TYPE"
        | "ENGINE_POWER_HP"
        | "TOP_SPEED_KMH";
      sortOrder: number;
    };

// Demo filter-panel composition for a few transport categories — shows all
// filter kinds (built-in Price/Year/Brand plus LOOKUP/NUMBER spec fields) so
// the vehicle shop's filter sidebar has something to render out of the box.
// "motorcycles" is a parent category, so its filters are inherited by every
// moto-* leaf category too (same inheritance convention as CATEGORY_FILTER_SEEDS).
const VEHICLE_CATEGORY_FILTER_SEEDS: VehicleCategoryFilterSeed[] = [
  { categorySlug: "motorcycles", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "motorcycles", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "motorcycles", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "motorcycles", filterType: "SPEC", specField: "FUEL_TYPE", sortOrder: 3 },
  { categorySlug: "motorcycles", filterType: "SPEC", specField: "TRANSMISSION_TYPE", sortOrder: 4 },
  { categorySlug: "motorcycles", filterType: "SPEC", specField: "ENGINE_POWER_HP", sortOrder: 5 },
  { categorySlug: "atvs", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "atvs", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "atvs", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "atvs", filterType: "SPEC", specField: "DRIVE_TYPE", sortOrder: 3 },
  { categorySlug: "atvs", filterType: "SPEC", specField: "ENGINE_POWER_HP", sortOrder: 4 },
  { categorySlug: "scooters", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "scooters", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "scooters", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "FUEL_TYPE", sortOrder: 3 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "TOP_SPEED_KMH", sortOrder: 4 },
];

async function seedVehicleCategoryFilters(categoryIdBySlug: Map<string, number>) {
  for (const filterSeed of VEHICLE_CATEGORY_FILTER_SEEDS) {
    const categoryId = categoryIdBySlug.get(filterSeed.categorySlug);
    if (!categoryId) {
      throw new Error(
        `Unknown category slug in vehicle category filter seed: ${filterSeed.categorySlug}`,
      );
    }

    if (filterSeed.filterType === "SPEC") {
      const existing = await prisma.vehicleCategoryFilterConfig.findFirst({
        where: { categoryId, specField: filterSeed.specField },
      });
      if (existing) {
        await prisma.vehicleCategoryFilterConfig.update({
          where: { id: existing.id },
          data: { sortOrder: filterSeed.sortOrder },
        });
      } else {
        await prisma.vehicleCategoryFilterConfig.create({
          data: {
            categoryId,
            filterType: "SPEC",
            specField: filterSeed.specField,
            sortOrder: filterSeed.sortOrder,
          },
        });
      }
      continue;
    }

    const existing = await prisma.vehicleCategoryFilterConfig.findFirst({
      where: { categoryId, filterType: filterSeed.filterType },
    });
    if (existing) {
      await prisma.vehicleCategoryFilterConfig.update({
        where: { id: existing.id },
        data: { sortOrder: filterSeed.sortOrder },
      });
    } else {
      await prisma.vehicleCategoryFilterConfig.create({
        data: { categoryId, filterType: filterSeed.filterType, sortOrder: filterSeed.sortOrder },
      });
    }
  }
  console.log(`Vehicle category filters ready: ${VEHICLE_CATEGORY_FILTER_SEEDS.length}`);
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
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
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
  await seedLookup("Order statuses", prisma.orderStatus, ORDER_STATUSES);
  await seedLookup("Colors", prisma.color, COLORS);
  await seedLookup("Sizes", prisma.size, SIZES);
  await seedLookup("Cities", prisma.city, CITIES);
  await prisma.city.update({ where: { key: "TBILISI" }, data: { isTbilisi: true } });

  const unitIdByNameKa = await seedUnits();

  const categoryIdBySlug = await seedCategoryTree(PRODUCT_CATEGORY_TREE, null);
  console.log(`Product category tree ready: ${categoryIdBySlug.size} categories`);

  await seedAttributes(categoryIdBySlug, unitIdByNameKa);
  await seedProductBrands(categoryIdBySlug);
  await seedCategoryFilters(categoryIdBySlug);
  await seedVehicleCategoryFilters(categoryIdBySlug);

  // Otherwise these rows only appear via lazy bootstrap on first admin/
  // public read (see homepage-sections.service.ts) — seeding them
  // explicitly means a fresh DB (e.g. after transferring migrations to
  // another machine) has the homepage sliders/categories section ready
  // immediately, not just after someone happens to load the page first.
  const homepageSections = await listHomepageSections();
  console.log(`Homepage sections ready: ${homepageSections.map((section) => section.type).join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
