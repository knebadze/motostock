import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/lib/roles.js";
import { USE_CLOUD_STORAGE_KEY } from "../src/modules/settings/constants/index.js";
import { processImageForDisk } from "../src/lib/image-processing.js";
import { listHomepageSections } from "../src/modules/homepage-sections/homepage-sections.service.js";
import { getCompanyInfo } from "../src/modules/company-info/company-info.service.js";
import { getTerms } from "../src/modules/terms/terms.service.js";
import { listEmailTemplates } from "../src/modules/email-templates/email-templates.service.js";

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

// A real seeded account (unlike most other roles, which an existing admin
// assigns via the Users admin page) — lets the OPERATOR role be tested
// immediately after a fresh seed, without first logging in as ADMIN.
const OPERATOR_EMAIL = "operator@gmail.com";
const OPERATOR_PASSWORD = "operator123";
const OPERATOR_FIRST_NAME = "Operator";
const OPERATOR_LAST_NAME = "User";

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

const CANCELLATION_REASONS: LookupEntry[] = [
  { key: "CUSTOMER_CHANGED_MIND", nameKa: "მომხმარებელმა გადაიფიქრა", nameEn: "Customer changed their mind", nameRu: "Клиент передумал" },
  { key: "OUT_OF_STOCK", nameKa: "მარაგი ამოიწურა", nameEn: "Out of stock", nameRu: "Нет в наличии" },
  { key: "PAYMENT_ISSUE", nameKa: "გადახდის პრობლემა", nameEn: "Payment issue", nameRu: "Проблема с оплатой" },
  { key: "DUPLICATE_ORDER", nameKa: "დუბლირებული შეკვეთა", nameEn: "Duplicate order", nameRu: "Дублирующий заказ" },
  { key: "SUSPECTED_FRAUD", nameKa: "საეჭვო შეკვეთა", nameEn: "Suspected fraud", nameRu: "Подозрение на мошенничество" },
  { key: "OTHER", nameKa: "სხვა", nameEn: "Other", nameRu: "Другое" },
];

// Job titles for the "our team" /about page (TeamMember.positionId) —
// covers the two customer-facing sides of the business: the retail shop
// and the service workshop.
const POSITIONS: LookupEntry[] = [
  { key: "STORE_MANAGER", nameKa: "მაღაზიის მენეჯერი", nameEn: "Store Manager", nameRu: "Менеджер магазина" },
  { key: "SALES_CONSULTANT", nameKa: "გაყიდვების კონსულტანტი", nameEn: "Sales Consultant", nameRu: "Консультант по продажам" },
  { key: "CASHIER", nameKa: "მოლარე", nameEn: "Cashier", nameRu: "Кассир" },
  { key: "WORKSHOP_MANAGER", nameKa: "სახელოსნოს ხელმძღვანელი", nameEn: "Workshop Manager", nameRu: "Руководитель мастерской" },
  { key: "MECHANIC", nameKa: "ხელოსანი", nameEn: "Mechanic", nameRu: "Механик" },
  { key: "DIAGNOSTICS_TECHNICIAN", nameKa: "დიაგნოსტიკოსი", nameEn: "Diagnostics Technician", nameRu: "Специалист по диагностике" },
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

// What the variant "size" axis measures per category (see SizeScale) — the
// name is the label shown for that axis in the admin form and on the site.
const SIZE_SCALES: LookupEntry[] = [
  { key: "CLOTHING", nameKa: "ზომა", nameEn: "Size", nameRu: "Размер" },
  { key: "SHOE_EU", nameKa: "ზომა (EU)", nameEn: "Size (EU)", nameRu: "Размер (EU)" },
  { key: "VOLUME", nameKa: "მოცულობა", nameEn: "Volume", nameRu: "Объём" },
  { key: "CHAIN_PITCH", nameKa: "ბიჯი", nameEn: "Pitch", nameRu: "Шаг" },
];

// Sizes per scale, beyond the clothing ones in SIZES above.
const SCALED_SIZES: { scaleKey: string; entries: LookupEntry[] }[] = [
  { scaleKey: "CLOTHING", entries: [{ key: "XXS", nameKa: "XXS", nameEn: "XXS", nameRu: "XXS" }, ...SIZES] },
  {
    scaleKey: "SHOE_EU",
    entries: Array.from({ length: 14 }, (_, index) => {
      const size = String(35 + index);
      return { key: `EU_${size}`, nameKa: size, nameEn: size, nameRu: size };
    }),
  },
  {
    scaleKey: "VOLUME",
    entries: [
      { key: "VOL_400ML", nameKa: "400 მლ", nameEn: "400 ml", nameRu: "400 мл" },
      { key: "VOL_500ML", nameKa: "0.5 ლ", nameEn: "0.5 L", nameRu: "0.5 л" },
      { key: "VOL_1L", nameKa: "1 ლ", nameEn: "1 L", nameRu: "1 л" },
      { key: "VOL_2L", nameKa: "2 ლ", nameEn: "2 L", nameRu: "2 л" },
      { key: "VOL_4L", nameKa: "4 ლ", nameEn: "4 L", nameRu: "4 л" },
      { key: "VOL_5L", nameKa: "5 ლ", nameEn: "5 L", nameRu: "5 л" },
    ],
  },
  {
    scaleKey: "CHAIN_PITCH",
    entries: ["415", "420", "428", "520", "525", "530", "532"].map((pitch) => ({
      key: `PITCH_${pitch}`,
      nameKa: pitch,
      nameEn: pitch,
      nameRu: pitch,
    })),
  },
];

// Category -> scale. Only fills an unset sizeScaleId (an admin's choice is
// never overwritten); subcategories inherit, so roots are enough.
const CATEGORY_SIZE_SCALES: Record<string, string> = {
  helmets: "CLOTHING",
  gear: "CLOTHING",
  boots: "SHOE_EU",
  fluids: "VOLUME",
  "chains-sprockets": "CHAIN_PITCH",
};

async function seedSizeScales(categoryIdBySlug: Map<string, number>) {
  await seedLookup("Size scales", prisma.sizeScale, SIZE_SCALES);
  const scaleIdByKey = new Map((await prisma.sizeScale.findMany()).map((scale) => [scale.key, scale.id]));
  for (const { scaleKey, entries } of SCALED_SIZES) {
    const scaleId = scaleIdByKey.get(scaleKey)!;
    for (const entry of entries) {
      await prisma.size.upsert({ where: { key: entry.key }, update: {}, create: { ...entry, scaleId } });
      await prisma.size.updateMany({ where: { key: entry.key, scaleId: null }, data: { scaleId } });
    }
  }
  for (const [slug, scaleKey] of Object.entries(CATEGORY_SIZE_SCALES)) {
    const categoryId = categoryIdBySlug.get(slug);
    if (!categoryId) throw new Error(`Unknown category slug in size scale seed: ${slug}`);
    await prisma.category.updateMany({
      where: { id: categoryId, sizeScaleId: null },
      data: { sizeScaleId: scaleIdByKey.get(scaleKey)! },
    });
  }
  console.log(`Size scales ready: ${SIZE_SCALES.length}`);
}

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
  // Only applied when the category is first created — after that both
  // switches are admin-controlled (Categories page), like the image.
  onlinePurchaseEnabled?: false;
  vehicleFitmentEnabled?: false;
  // Off = the category stops inheriting its ancestors' attributes (see
  // Category.inheritsAttributes). Also create-only.
  inheritsAttributes?: false;
  children?: CategorySeed[];
};

// The store's catalog structure (client-supplied "მოტოსტოკის ვებკატალოგის
// სარჩევი", 2026-10). Existing slugs were kept wherever the concept stayed
// the same (helmets, gear, jackets, brakes, tires, ...) so images, attributes,
// brands, filters and demo products keep pointing at the right place.
// "transport" must keep its slug — it's the vehicle root the code keys on
// (VEHICLE_ROOT_CATEGORY_SLUG).
const PRODUCT_CATEGORY_TREE: CategorySeed[] = [
  {
    slug: "helmets",
    nameKa: "ჩაფხუტი",
    nameEn: "Helmets",
    nameRu: "Шлемы",
    vehicleFitmentEnabled: false,
    children: [
      { slug: "helmet-full-face", nameKa: "დახურული", nameEn: "Full-Face", nameRu: "Закрытые" },
      { slug: "helmet-open-face", nameKa: "ღია", nameEn: "Open-Face", nameRu: "Открытые" },
      { slug: "helmet-modular", nameKa: "მოდულარი", nameEn: "Modular", nameRu: "Модуляры" },
      { slug: "helmet-enduro", nameKa: "ენდურო", nameEn: "Enduro", nameRu: "Эндуро" },
      { slug: "helmet-dual-sport", nameKa: "დუალ-სპორტი", nameEn: "Dual-Sport", nameRu: "Дуал-спорт" },
      {
        slug: "helmet-accessories",
        nameKa: "ჩაფხუტის აქსესუარები",
        nameEn: "Helmet Accessories",
        nameRu: "Аксессуары для шлемов",
        inheritsAttributes: false,
        children: [
          { slug: "intercoms", nameKa: "ინტერკომი", nameEn: "Intercoms", nameRu: "Мотогарнитуры" },
          { slug: "helmet-visor", nameKa: "ვიზორი", nameEn: "Visors", nameRu: "Визоры" },
          { slug: "pinlock", nameKa: "პინლოქი", nameEn: "Pinlock", nameRu: "Пинлок" },
          { slug: "balaclavas", nameKa: "ბალაკლავა", nameEn: "Balaclavas", nameRu: "Балаклавы" },
          { slug: "goggles", nameKa: "მოტოსათვალეები", nameEn: "Goggles", nameRu: "Мотоочки" },
          { slug: "helmet-care", nameKa: "ჩაფხუტის მოვლის საშუალებები", nameEn: "Helmet Care", nameRu: "Средства ухода за шлемом" },
          { slug: "helmet-decor", nameKa: "დეკორატიული აქსესუარები", nameEn: "Decorative Accessories", nameRu: "Декоративные аксессуары" },
        ],
      },
    ],
  },
  {
    slug: "gear",
    nameKa: "მოტოეკიპირება",
    nameEn: "Riding Gear",
    nameRu: "Мотоэкипировка",
    vehicleFitmentEnabled: false,
    children: [
      { slug: "jackets", nameKa: "ქურთუკი", nameEn: "Jackets", nameRu: "Куртки" },
      { slug: "gloves", nameKa: "ხელთათმანი", nameEn: "Gloves", nameRu: "Перчатки" },
      { slug: "pants", nameKa: "შარვალი", nameEn: "Pants", nameRu: "Брюки" },
      { slug: "riding-suits", nameKa: "მოტო კომბინიზონი", nameEn: "Riding Suits", nameRu: "Мотокомбинезоны" },
      { slug: "protection", nameKa: "დამცავი აღჭურვილობა", nameEn: "Protective Gear", nameRu: "Защитная экипировка" },
      { slug: "rain-gear", nameKa: "საწვიმარი", nameEn: "Rain Gear", nameRu: "Дождевики" },
      { slug: "boots", nameKa: "მოტოჩექმები და ფეხსაცმელი", nameEn: "Boots & Shoes", nameRu: "Мотоботы и обувь" },
      { slug: "shoe-protectors", nameKa: "ფეხსაცმლის დამცავები", nameEn: "Shoe Protectors", nameRu: "Защита обуви" },
      { slug: "apparel", nameKa: "ტანსაცმელი", nameEn: "Apparel", nameRu: "Одежда" },
      { slug: "luggage", nameKa: "ჩანთა და საბარგული", nameEn: "Bags & Luggage", nameRu: "Сумки и багаж", inheritsAttributes: false },
    ],
  },
  {
    slug: "accessories",
    nameKa: "აქსესუარები",
    nameEn: "Accessories",
    nameRu: "Аксессуары",
    vehicleFitmentEnabled: false,
    children: [
      {
        slug: "phone-navigation",
        nameKa: "ტელეფონი და ნავიგაცია",
        nameEn: "Phone & Navigation",
        nameRu: "Телефон и навигация",
        children: [
          { slug: "phone-mounts", nameKa: "ტელეფონის სამაგრები", nameEn: "Phone Mounts", nameRu: "Держатели для телефона" },
          { slug: "phone-chargers", nameKa: "ტელეფონის დამტენები", nameEn: "Phone Chargers", nameRu: "Зарядные устройства для телефона" },
          { slug: "gps-navigators", nameKa: "GPS ნავიგატორები", nameEn: "GPS Navigators", nameRu: "GPS-навигаторы" },
        ],
      },
      {
        slug: "security",
        nameKa: "დაცვა და უსაფრთხოება",
        nameEn: "Security",
        nameRu: "Защита и безопасность",
        children: [
          { slug: "locks", nameKa: "საკეტი", nameEn: "Locks", nameRu: "Замки" },
          { slug: "disc-locks", nameKa: "დისკის საკეტი", nameEn: "Disc Locks", nameRu: "Замки на диск" },
          { slug: "alarms", nameKa: "სიგნალიზაცია", nameEn: "Alarms", nameRu: "Сигнализации" },
        ],
      },
      {
        slug: "care-practical",
        nameKa: "მოტოციკლის მოვლა და პრაქტიკული აქსესუარები",
        nameEn: "Motorcycle Care & Practical Accessories",
        nameRu: "Уход за мотоциклом и практичные аксессуары",
        children: [
          { slug: "bike-covers", nameKa: "მოტოციკლის გადასაფარებელი", nameEn: "Motorcycle Covers", nameRu: "Чехлы для мотоцикла" },
          { slug: "cargo-nets", nameKa: "ბარგის დასამაგრებელი ბადე", nameEn: "Cargo Nets", nameRu: "Багажные сетки" },
          { slug: "chain-brushes", nameKa: "ჯაჭვის საწმენდი ჯაგრისი", nameEn: "Chain Cleaning Brushes", nameRu: "Щётки для чистки цепи" },
          { slug: "wrenches", nameKa: "გასაღები", nameEn: "Wrenches", nameRu: "Ключи" },
          { slug: "tools", nameKa: "ხელსაწყოები", nameEn: "Tools", nameRu: "Инструменты" },
          // Same name as the gear subcategory "shoe-protectors" — listed in
          // both places in the client's catalog, so it needs its own slug.
          { slug: "care-shoe-protectors", nameKa: "ფეხსაცმლის დამცავები", nameEn: "Shoe Protectors", nameRu: "Защита обуви" },
          { slug: "brake-reservoir-covers", nameKa: "სამუხრუჭე სითხის რეზერვუარის დამცავი", nameEn: "Brake Reservoir Covers", nameRu: "Защита бачка тормозной жидкости" },
          { slug: "helmet-hangers", nameKa: "ჩაფხუტის საკიდი", nameEn: "Helmet Hangers", nameRu: "Держатели для шлема" },
          { slug: "cup-holders", nameKa: "ჭიქის დამჭერი", nameEn: "Cup Holders", nameRu: "Подстаканники" },
        ],
      },
      {
        slug: "visual-accessories",
        nameKa: "ვიზუალური აქსესუარები",
        nameEn: "Visual Accessories",
        nameRu: "Визуальные аксессуары",
        children: [
          { slug: "stickers", nameKa: "სტიკერები", nameEn: "Stickers", nameRu: "Наклейки" },
          { slug: "keychains", nameKa: "ბრელოკი", nameEn: "Keychains", nameRu: "Брелоки" },
        ],
      },
      {
        slug: "gifts",
        nameKa: "საჩუქრები",
        nameEn: "Gifts",
        nameRu: "Подарки",
        children: [
          { slug: "puzzles", nameKa: "ფაზლები", nameEn: "Puzzles", nameRu: "Пазлы" },
          { slug: "scale-models", nameKa: "მოტოციკლების მინიატურული მოდელები", nameEn: "Scale Motorcycle Models", nameRu: "Масштабные модели мотоциклов" },
          { slug: "gift-vouchers", nameKa: "სასაჩუქრე ვაუჩერი", nameEn: "Gift Vouchers", nameRu: "Подарочные сертификаты" },
        ],
      },
    ],
  },
  {
    slug: "parts",
    nameKa: "სათადარიგო ნაწილები",
    nameEn: "Spare Parts",
    nameRu: "Запчасти",
    children: [
      {
        slug: "fluids",
        nameKa: "ზეთები და მოვლის საშუალებები",
        nameEn: "Oils & Care Products",
        nameRu: "Масла и средства ухода",
        inheritsAttributes: false,
        children: [
          { slug: "engine-oil", nameKa: "ძრავის ზეთი", nameEn: "Engine Oil", nameRu: "Моторное масло" },
          { slug: "fork-oil", nameKa: "ამორტიზატორის ზეთი", nameEn: "Fork & Shock Oil", nameRu: "Масло для амортизаторов" },
          { slug: "chain-cleaners", nameKa: "ჯაჭვის საწმენდი საშუალება", nameEn: "Chain Cleaners", nameRu: "Очистители цепи" },
          { slug: "chain-lubes", nameKa: "ჯაჭვის საპოხი საშუალება", nameEn: "Chain Lubes", nameRu: "Смазки для цепи" },
          { slug: "engine-cleaners", nameKa: "ძრავის საწმენდი საშუალება", nameEn: "Engine Cleaners", nameRu: "Очистители двигателя" },
          { slug: "fuel-system-cleaners", nameKa: "საწვავის სისტემის საწმენდი საშუალება", nameEn: "Fuel System Cleaners", nameRu: "Очистители топливной системы" },
          { slug: "cooling-system-cleaners", nameKa: "გაგრილების სისტემის საწმენდი საშუალება", nameEn: "Cooling System Cleaners", nameRu: "Очистители системы охлаждения" },
          { slug: "leather-cleaners", nameKa: "ტყავის საწმენდი საშუალება", nameEn: "Leather Cleaners", nameRu: "Средства для чистки кожи" },
          { slug: "antifreeze", nameKa: "ანტიფრიზი", nameEn: "Antifreeze", nameRu: "Антифриз" },
        ],
      },
      {
        slug: "filters",
        nameKa: "ფილტრები",
        nameEn: "Filters",
        nameRu: "Фильтры",
        children: [
          { slug: "air-filters", nameKa: "ჰაერის ფილტრი", nameEn: "Air Filters", nameRu: "Воздушные фильтры" },
          { slug: "oil-filters", nameKa: "ზეთის ფილტრი", nameEn: "Oil Filters", nameRu: "Масляные фильтры" },
        ],
      },
      {
        slug: "wear-parts",
        nameKa: "ცვეთადი ნაწილები",
        nameEn: "Wear Parts",
        nameRu: "Расходные запчасти",
        children: [
          { slug: "brake-pads", nameKa: "სამუხრუჭე ხუნდი", nameEn: "Brake Pads", nameRu: "Тормозные колодки" },
          { slug: "spark-plugs", nameKa: "აალების სანთელი", nameEn: "Spark Plugs", nameRu: "Свечи зажигания" },
          { slug: "batteries", nameKa: "აკუმულატორი", nameEn: "Batteries", nameRu: "Аккумуляторы" },
          { slug: "battery-chargers", nameKa: "აკუმულატორის დამტენი", nameEn: "Battery Chargers", nameRu: "Зарядные устройства для АКБ" },
          { slug: "chains-sprockets", nameKa: "ჯაჭვები და კბილანები", nameEn: "Chains & Sprockets", nameRu: "Цепи и звёзды" },
          { slug: "fork-seals", nameKa: "ჩანგლის ჩობალი", nameEn: "Fork Seals", nameRu: "Сальники вилки" },
          { slug: "clutch-plates", nameKa: "გადაბმულობის ფირფიტები", nameEn: "Clutch Plates", nameRu: "Диски сцепления" },
        ],
      },
      {
        slug: "engine-transmission",
        nameKa: "ძრავი და გადაცემათა კოლოფი",
        nameEn: "Engine & Transmission",
        nameRu: "Двигатель и коробка передач",
        children: [
          { slug: "engine-parts", nameKa: "ძრავის ნაწილები", nameEn: "Engine Parts", nameRu: "Детали двигателя" },
          { slug: "transmission-parts", nameKa: "გადაცემათა კოლოფის ნაწილები", nameEn: "Transmission Parts", nameRu: "Детали коробки передач" },
        ],
      },
      {
        slug: "electrical",
        nameKa: "ელექტროსისტემა",
        nameEn: "Electrical System",
        nameRu: "Электросистема",
        children: [
          { slug: "relays", nameKa: "რელე", nameEn: "Relays", nameRu: "Реле" },
          { slug: "ignition-coils", nameKa: "აალების კოჭები (ბაბინები)", nameEn: "Ignition Coils", nameRu: "Катушки зажигания" },
          { slug: "spark-plug-caps", nameKa: "სანთლის ჩიბუხი", nameEn: "Spark Plug Caps", nameRu: "Колпачки свечей" },
          {
            slug: "sensors",
            nameKa: "სენსორები",
            nameEn: "Sensors",
            nameRu: "Датчики",
            children: [
              { slug: "abs-sensors", nameKa: "ABS-ის სენსორები", nameEn: "ABS Sensors", nameRu: "Датчики ABS" },
              { slug: "temperature-sensors", nameKa: "ტემპერატურის სენსორები", nameEn: "Temperature Sensors", nameRu: "Датчики температуры" },
              { slug: "oil-sensors", nameKa: "ზეთის სენსორები", nameEn: "Oil Sensors", nameRu: "Датчики масла" },
              { slug: "pressure-sensors", nameKa: "წნევის სენსორები", nameEn: "Pressure Sensors", nameRu: "Датчики давления" },
              { slug: "speed-sensors", nameKa: "სიჩქარის სენსორები", nameEn: "Speed Sensors", nameRu: "Датчики скорости" },
            ],
          },
        ],
      },
      {
        slug: "cooling",
        nameKa: "გაგრილების სისტემა",
        nameEn: "Cooling System",
        nameRu: "Система охлаждения",
        children: [
          { slug: "radiators", nameKa: "რადიატორები", nameEn: "Radiators", nameRu: "Радиаторы" },
          { slug: "radiator-caps", nameKa: "რადიატორის თავსახურები", nameEn: "Radiator Caps", nameRu: "Крышки радиатора" },
          { slug: "water-pumps", nameKa: "წყლის ტუმბოები", nameEn: "Water Pumps", nameRu: "Водяные насосы" },
          { slug: "coolant-hoses", nameKa: "გამაგრილებელი სითხის მილები", nameEn: "Coolant Hoses", nameRu: "Патрубки охлаждения" },
          { slug: "cooling-fans", nameKa: "ვენტილატორები", nameEn: "Cooling Fans", nameRu: "Вентиляторы" },
        ],
      },
      {
        slug: "exhaust",
        nameKa: "გამონაბოლქვის სისტემა",
        nameEn: "Exhaust System",
        nameRu: "Выхлопная система",
        children: [
          { slug: "slip-ons", nameKa: "სლიპონი", nameEn: "Slip-Ons", nameRu: "Слипоны" },
          { slug: "full-exhaust-systems", nameKa: "გამონაბოლქვის სრული სისტემა", nameEn: "Full Exhaust Systems", nameRu: "Полные выхлопные системы" },
          { slug: "link-pipes", nameKa: "შუალედური მილები", nameEn: "Link Pipes", nameRu: "Промежуточные трубы" },
          { slug: "mufflers", nameKa: "ხმის ჩამხშობი", nameEn: "Mufflers", nameRu: "Глушители" },
          { slug: "exhaust-wrap", nameKa: "თბოსაიზოლაციო ლენტა", nameEn: "Exhaust Wrap", nameRu: "Термолента" },
          { slug: "exhaust-headers", nameKa: "გამონაბოლქვის კოლექტორი", nameEn: "Exhaust Headers", nameRu: "Выпускные коллекторы" },
        ],
      },
      {
        slug: "suspension",
        nameKa: "ამორტიზატორები და სავალი ნაწილი",
        nameEn: "Suspension & Chassis",
        nameRu: "Подвеска и ходовая часть",
        children: [
          { slug: "front-forks", nameKa: "წინა ჩანგალი", nameEn: "Front Forks", nameRu: "Передние вилки" },
          { slug: "rear-shocks", nameKa: "უკანა ამორტიზატორები", nameEn: "Rear Shocks", nameRu: "Задние амортизаторы" },
          { slug: "bearings", nameKa: "საკისრები", nameEn: "Bearings", nameRu: "Подшипники" },
          { slug: "bushings", nameKa: "ბუშინგები (რეზინის ბუდეები)", nameEn: "Bushings", nameRu: "Втулки (сайлентблоки)" },
          { slug: "triple-clamps", nameKa: "ტრავერსები", nameEn: "Triple Clamps", nameRu: "Траверсы" },
          { slug: "seals", nameKa: "ჩობალი", nameEn: "Seals", nameRu: "Сальники" },
        ],
      },
      {
        slug: "controls",
        nameKa: "საჭე და მართვის ელემენტები",
        nameEn: "Handlebars & Controls",
        nameRu: "Руль и органы управления",
        children: [
          { slug: "handlebars", nameKa: "საჭეები და კლიპონები", nameEn: "Handlebars & Clip-Ons", nameRu: "Рули и клипоны" },
          { slug: "grips", nameKa: "გრიპსები (სახელურები)", nameEn: "Grips", nameRu: "Грипсы" },
          { slug: "levers", nameKa: "ბერკეტები (ლევერი)", nameEn: "Levers", nameRu: "Рычаги" },
          { slug: "handlebar-sliders", nameKa: "საჭის სლაიდერები", nameEn: "Handlebar Sliders", nameRu: "Слайдеры руля" },
          { slug: "mirrors", nameKa: "სარკეები", nameEn: "Mirrors", nameRu: "Зеркала" },
          { slug: "hand-guards", nameKa: "ხელის დამცავები", nameEn: "Hand Guards", nameRu: "Защита рук" },
          { slug: "switch-controls", nameKa: "მართვის ბლოკები", nameEn: "Switch Controls", nameRu: "Блоки управления" },
          { slug: "steering-dampers", nameKa: "საჭის დემპფერები", nameEn: "Steering Dampers", nameRu: "Рулевые демпферы" },
        ],
      },
      {
        slug: "brakes",
        nameKa: "სამუხრუჭე სისტემა",
        nameEn: "Brake System",
        nameRu: "Тормозная система",
        children: [
          { slug: "master-cylinders", nameKa: "მთავარი სამუხრუჭე ცილინდრები", nameEn: "Master Cylinders", nameRu: "Главные тормозные цилиндры" },
          { slug: "brake-discs", nameKa: "სამუხრუჭე დისკები", nameEn: "Brake Discs", nameRu: "Тормозные диски" },
          { slug: "brake-lines", nameKa: "სამუხრუჭე შლანგები და კაბელები", nameEn: "Brake Lines & Cables", nameRu: "Тормозные шланги и тросы" },
          { slug: "brake-calipers", nameKa: "სამუხრუჭე სუპორტები", nameEn: "Brake Calipers", nameRu: "Тормозные суппорты" },
        ],
      },
      {
        slug: "fasteners",
        nameKa: "სამაგრები",
        nameEn: "Fasteners",
        nameRu: "Крепёж",
        children: [
          { slug: "bolts", nameKa: "ჭანჭიკები, ბოლტები და სხვა სამაგრები", nameEn: "Nuts, Bolts & Other Fasteners", nameRu: "Гайки, болты и прочий крепёж" },
        ],
      },
      {
        slug: "body-parts",
        nameKa: "გარე ნაწილები და ვიზუალი",
        nameEn: "Body Parts & Styling",
        nameRu: "Внешние детали и стайлинг",
        children: [
          { slug: "windscreens", nameKa: "საქარე მინები", nameEn: "Windscreens", nameRu: "Ветровые стёкла" },
          { slug: "body-kits", nameKa: "ბოდი-კიტები", nameEn: "Body Kits", nameRu: "Обвесы" },
          { slug: "radiator-guards", nameKa: "რადიატორის ცხაურები", nameEn: "Radiator Guards", nameRu: "Решётки радиатора" },
          { slug: "license-plate-holders", nameKa: "სანომრე ნიშნების სამაგრები", nameEn: "License Plate Holders", nameRu: "Рамки номерного знака" },
          { slug: "sissy-bars", nameKa: "სისი-ბარები (უკანა მგზავრის საზურგე/სამაგრი)", nameEn: "Sissy Bars", nameRu: "Спинки пассажира (сисибары)" },
        ],
      },
      {
        slug: "seats",
        nameKa: "სკამი",
        nameEn: "Seats",
        nameRu: "Сиденья",
        children: [
          { slug: "motorcycle-seats", nameKa: "მოტოციკლის სკამები", nameEn: "Motorcycle Seats", nameRu: "Сиденья для мотоцикла" },
          { slug: "seat-covers", nameKa: "სკამის გადასაკრავები", nameEn: "Seat Covers", nameRu: "Чехлы для сиденья" },
        ],
      },
    ],
  },
  {
    slug: "transport",
    nameKa: "მოტოტექნიკა",
    nameEn: "Motor Vehicles",
    nameRu: "Мототехника",
    // Vehicles are bought at the showroom, not through the cart; and they
    // aren't parts, so product fitment doesn't apply to them.
    onlinePurchaseEnabled: false,
    vehicleFitmentEnabled: false,
    children: [
      { slug: "motorcycles", nameKa: "მოტოციკლები", nameEn: "Motorcycles", nameRu: "Мотоциклы" },
      { slug: "atvs", nameKa: "კვადროციკლები", nameEn: "ATVs", nameRu: "Квадроциклы" },
      { slug: "scooters", nameKa: "სკუტერები", nameEn: "Scooters", nameRu: "Скутеры" },
      { slug: "mopeds", nameKa: "მოპედები", nameEn: "Mopeds", nameRu: "Мопеды" },
      { slug: "trikes", nameKa: "ტრიციკლები", nameEn: "Trikes", nameRu: "Трициклы" },
    ],
  },
  {
    slug: "tires",
    nameKa: "საბურავები",
    nameEn: "Tires",
    nameRu: "Шины",
    children: [
      { slug: "motorcycle-tires", nameKa: "მოტოციკლის საბურავები", nameEn: "Motorcycle Tires", nameRu: "Мотошины" },
      { slug: "atv-tires", nameKa: "კვადროციკლის საბურავები", nameEn: "ATV Tires", nameRu: "Шины для квадроциклов" },
      { slug: "kick-scooter-tires", nameKa: "სქროლის საბურავები", nameEn: "Kick Scooter Tires", nameRu: "Шины для самокатов" },
      { slug: "trike-tires", nameKa: "ტრიციკლის საბურავები", nameEn: "Trike Tires", nameRu: "Шины для трициклов" },
    ],
  },
];

// The seed is the source of truth for the catalog STRUCTURE: re-running it
// creates missing categories and re-syncs existing ones' names, parent and
// order (sibling position). Images and the two switches above are only set
// on create — those stay admin-controlled afterwards. Categories that were
// dropped from this tree are left alone (they may still hold products).
async function seedCategoryTree(
  nodes: CategorySeed[],
  parentId: number | null,
  idBySlug: Map<string, number> = new Map(),
) {
  for (const [index, node] of nodes.entries()) {
    // Backfill a seed image only when the category doesn't already have one —
    // re-running the seed must never clobber an image an admin uploaded/changed by hand.
    const existing = await prisma.category.findUnique({ where: { slug: node.slug } });
    const imageUrl = existing?.imageUrl ? undefined : await seedImageUrl("categories", node.slug);
    const structure = {
      nameKa: node.nameKa,
      nameEn: node.nameEn,
      nameRu: node.nameRu,
      parentId,
      sortOrder: index,
    };

    const category = await prisma.category.upsert({
      where: { slug: node.slug },
      update: { ...structure, ...(imageUrl ? { imageUrl } : {}) },
      create: {
        slug: node.slug,
        ...structure,
        ...(node.onlinePurchaseEnabled === false ? { onlinePurchaseEnabled: false } : {}),
        ...(node.vehicleFitmentEnabled === false ? { vehicleFitmentEnabled: false } : {}),
        ...(node.inheritsAttributes === false ? { inheritsAttributes: false } : {}),
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
  { nameKa: "ვოლტი", nameEn: "Volt", nameRu: "Вольт", abbreviationKa: "V", abbreviationEn: "V", abbreviationRu: "В" },
  { nameKa: "ვატი", nameEn: "Watt", nameRu: "Ватт", abbreviationKa: "W", abbreviationEn: "W", abbreviationRu: "Вт" },
  { nameKa: "ამპერი", nameEn: "Ampere", nameRu: "Ампер", abbreviationKa: "A", abbreviationEn: "A", abbreviationRu: "А" },
  { nameKa: "ბარი", nameEn: "Bar", nameRu: "Бар", abbreviationKa: "bar", abbreviationEn: "bar", abbreviationRu: "бар" },
  { nameKa: "დიუმი", nameEn: "Inch", nameRu: "Дюйм", abbreviationKa: "″", abbreviationEn: "in", abbreviationRu: "″" },
  { nameKa: "საათი", nameEn: "Hour", nameRu: "Час", abbreviationKa: "სთ", abbreviationEn: "h", abbreviationRu: "ч" },
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

const ARMOR_LEVEL_OPTIONS: AttributeOptionSeed[] = [
  { key: "NONE", labelKa: "არცერთი", labelEn: "None", labelRu: "Нет" },
  { key: "CE1", labelKa: "დონე 1", labelEn: "Level 1", labelRu: "Уровень 1" },
  { key: "CE2", labelKa: "დონე 2", labelEn: "Level 2", labelRu: "Уровень 2" },
];

const BACK_PROTECTOR_OPTIONS: AttributeOptionSeed[] = [
  { key: "NONE", labelKa: "არ აქვს", labelEn: "None", labelRu: "Нет" },
  { key: "POCKET", labelKa: "ჯიბე (დამცავის გარეშე)", labelEn: "Pocket only", labelRu: "Только карман" },
  { key: "LEVEL_1", labelKa: "დონე 1", labelEn: "Level 1", labelRu: "Уровень 1" },
  { key: "LEVEL_2", labelKa: "დონე 2", labelEn: "Level 2", labelRu: "Уровень 2" },
];

const GARMENT_CLASS_OPTIONS: AttributeOptionSeed[] = [
  { key: "AAA", labelKa: "AAA", labelEn: "AAA", labelRu: "AAA" },
  { key: "AA", labelKa: "AA", labelEn: "AA", labelRu: "AA" },
  { key: "A", labelKa: "A", labelEn: "A", labelRu: "A" },
  { key: "B", labelKa: "B", labelEn: "B", labelRu: "B" },
  { key: "C", labelKa: "C", labelEn: "C", labelRu: "C" },
];

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
      { key: "ECE", labelKa: "ECE 22.05", labelEn: "ECE 22.05", labelRu: "ECE 22.05" },
      { key: "ECE_2206", labelKa: "ECE 22.06", labelEn: "ECE 22.06", labelRu: "ECE 22.06" },
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
  // European protective-gear standards: EN 1621-1 limb armor, EN 1621-2
  // back protector, EN 17092 whole-garment class (jackets/pants/suits),
  // EN 13594 gloves, EN 13634 boots.
  {
    categorySlug: "jackets",
    nameKa: "დამცავის დონე (EN 1621-1)",
    nameEn: "Armor Level (EN 1621-1)",
    nameRu: "Уровень защиты (EN 1621-1)",
    valueType: "SELECT",
    options: ARMOR_LEVEL_OPTIONS,
  },
  {
    categorySlug: "jackets",
    nameKa: "ზურგის დამცავი (EN 1621-2)",
    nameEn: "Back Protector (EN 1621-2)",
    nameRu: "Защита спины (EN 1621-2)",
    valueType: "SELECT",
    options: BACK_PROTECTOR_OPTIONS,
  },
  {
    categorySlug: "jackets",
    nameKa: "დაცვის კლასი (EN 17092)",
    nameEn: "Protection Class (EN 17092)",
    nameRu: "Класс защиты (EN 17092)",
    valueType: "SELECT",
    options: GARMENT_CLASS_OPTIONS,
  },
  {
    categorySlug: "pants",
    nameKa: "დამცავის დონე (EN 1621-1)",
    nameEn: "Armor Level (EN 1621-1)",
    nameRu: "Уровень защиты (EN 1621-1)",
    valueType: "SELECT",
    options: ARMOR_LEVEL_OPTIONS,
  },
  {
    categorySlug: "pants",
    nameKa: "დაცვის კლასი (EN 17092)",
    nameEn: "Protection Class (EN 17092)",
    nameRu: "Класс защиты (EN 17092)",
    valueType: "SELECT",
    options: GARMENT_CLASS_OPTIONS,
  },
  {
    categorySlug: "riding-suits",
    nameKa: "დამცავის დონე (EN 1621-1)",
    nameEn: "Armor Level (EN 1621-1)",
    nameRu: "Уровень защиты (EN 1621-1)",
    valueType: "SELECT",
    options: ARMOR_LEVEL_OPTIONS,
  },
  {
    categorySlug: "riding-suits",
    nameKa: "ზურგის დამცავი (EN 1621-2)",
    nameEn: "Back Protector (EN 1621-2)",
    nameRu: "Защита спины (EN 1621-2)",
    valueType: "SELECT",
    options: BACK_PROTECTOR_OPTIONS,
  },
  {
    categorySlug: "riding-suits",
    nameKa: "დაცვის კლასი (EN 17092)",
    nameEn: "Protection Class (EN 17092)",
    nameRu: "Класс защиты (EN 17092)",
    valueType: "SELECT",
    options: GARMENT_CLASS_OPTIONS,
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
    categorySlug: "gloves",
    nameKa: "სერტიფიკატი (EN 13594)",
    nameEn: "Certification (EN 13594)",
    nameRu: "Сертификат (EN 13594)",
    valueType: "SELECT",
    options: [
      { key: "NONE", labelKa: "არ აქვს", labelEn: "None", labelRu: "Нет" },
      { key: "LEVEL_1", labelKa: "დონე 1", labelEn: "Level 1", labelRu: "Уровень 1" },
      { key: "LEVEL_1KP", labelKa: "დონე 1 KP", labelEn: "Level 1 KP", labelRu: "Уровень 1 KP" },
      { key: "LEVEL_2", labelKa: "დონე 2", labelEn: "Level 2", labelRu: "Уровень 2" },
      { key: "LEVEL_2KP", labelKa: "დონე 2 KP", labelEn: "Level 2 KP", labelRu: "Уровень 2 KP" },
    ],
  },
  {
    categorySlug: "boots",
    nameKa: "სერტიფიკატი (EN 13634)",
    nameEn: "Certification (EN 13634)",
    nameRu: "Сертификат (EN 13634)",
    valueType: "SELECT",
    options: [
      { key: "NONE", labelKa: "არ აქვს", labelEn: "None", labelRu: "Нет" },
      { key: "LEVEL_1", labelKa: "დონე 1", labelEn: "Level 1", labelRu: "Уровень 1" },
      { key: "LEVEL_2", labelKa: "დონე 2", labelEn: "Level 2", labelRu: "Уровень 2" },
    ],
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
  // Luggage doesn't inherit riding-gear attributes (Category.inheritsAttributes
  // off — "season" makes no sense for a bag), so it has its own.
  {
    categorySlug: "luggage",
    nameKa: "მასალა",
    nameEn: "Material",
    nameRu: "Материал",
    valueType: "SELECT",
    options: [
      { key: "TEXTILE", labelKa: "ტექსტილი", labelEn: "Textile", labelRu: "Текстиль" },
      { key: "LEATHER", labelKa: "ტყავი", labelEn: "Leather", labelRu: "Кожа" },
      { key: "PLASTIC", labelKa: "პლასტიკი", labelEn: "Plastic", labelRu: "Пластик" },
      { key: "ALUMINUM", labelKa: "ალუმინი", labelEn: "Aluminum", labelRu: "Алюминий" },
    ],
  },
  {
    categorySlug: "luggage",
    nameKa: "წყალგამძლეობა",
    nameEn: "Waterproof",
    nameRu: "Водонепроницаемость",
    valueType: "BOOLEAN",
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
    categorySlug: "brake-pads",
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

// Attributes for the categories that had none of their own (2026-11 catalog
// review) — the specs shoppers actually filter/compare by in each one.
// Compact tuple helpers instead of the long-hand objects above, since there
// are ~90 of them. Vehicle compatibility is NOT here: that's fitment.
type Label = [ka: string, en: string, ru: string];

function option(key: string, ka: string, en: string, ru: string): AttributeOptionSeed {
  return { key, labelKa: ka, labelEn: en, labelRu: ru };
}

// Options whose label is the same in every language (sizes, codes, grades).
function codeOptions(...codes: string[]): AttributeOptionSeed[] {
  return codes.map((code) => option(code.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase(), code, code, code));
}

function selectAttr(categorySlug: string, [ka, en, ru]: Label, options: AttributeOptionSeed[]): AttributeSeed {
  return { categorySlug, nameKa: ka, nameEn: en, nameRu: ru, valueType: "SELECT", options };
}

function numberAttr(categorySlug: string, [ka, en, ru]: Label, unitNameKa?: string): AttributeSeed {
  return { categorySlug, nameKa: ka, nameEn: en, nameRu: ru, valueType: "NUMBER", unitNameKa };
}

function booleanAttr(categorySlug: string, [ka, en, ru]: Label): AttributeSeed {
  return { categorySlug, nameKa: ka, nameEn: en, nameRu: ru, valueType: "BOOLEAN" };
}

function textAttr(categorySlug: string, [ka, en, ru]: Label): AttributeSeed {
  return { categorySlug, nameKa: ka, nameEn: en, nameRu: ru, valueType: "TEXT" };
}

const POSITION: Label = ["პოზიცია", "Position", "Позиция"];
const POSITION_OPTIONS = [
  option("FRONT", "წინა", "Front", "Передний"),
  option("REAR", "უკანა", "Rear", "Задний"),
  option("FRONT_REAR", "წინა და უკანა", "Front & Rear", "Передний и задний"),
];

const SIDE: Label = ["მხარე", "Side", "Сторона"];
const SIDE_OPTIONS = [
  option("LEFT", "მარცხენა", "Left", "Левый"),
  option("RIGHT", "მარჯვენა", "Right", "Правый"),
  option("PAIR", "წყვილი", "Pair", "Пара"),
];

const HANDLEBAR_DIAMETER: Label = ["საჭის დიამეტრი", "Handlebar Diameter", "Диаметр руля"];
const HANDLEBAR_DIAMETER_OPTIONS = [
  option("D22", '22 მმ (7/8")', '22 mm (7/8")', '22 мм (7/8")'),
  option("D25", '25.4 მმ (1")', '25.4 mm (1")', '25.4 мм (1")'),
  option("D28", '28.6 მმ (1 1/8")', '28.6 mm (1 1/8")', '28.6 мм (1 1/8")'),
];

const TINT: Label = ["ტონირება", "Tint", "Тонировка"];
const TINT_OPTIONS = [
  option("CLEAR", "გამჭვირვალე", "Clear", "Прозрачный"),
  option("LIGHT_SMOKE", "ღია მუქი", "Light Smoke", "Светло-тонированный"),
  option("DARK_SMOKE", "მუქი", "Dark Smoke", "Тёмный"),
  option("IRIDIUM", "ირიდიუმი (სარკისებრი)", "Iridium (Mirrored)", "Иридиум (зеркальный)"),
  option("YELLOW", "ყვითელი", "Yellow", "Жёлтый"),
  option("PHOTOCHROMIC", "ფოტოქრომული", "Photochromic", "Фотохромный"),
];

const INNER_DIAMETER: Label = ["შიგა დიამეტრი", "Inner Diameter", "Внутренний диаметр"];
const OUTER_DIAMETER: Label = ["გარე დიამეტრი", "Outer Diameter", "Внешний диаметр"];
const WIDTH: Label = ["სიგანე/სისქე", "Width/Thickness", "Ширина/толщина"];
// Bearings, seals, bushings — identified by their three dimensions.
function dimensionAttrs(categorySlug: string): AttributeSeed[] {
  return [
    numberAttr(categorySlug, INNER_DIAMETER, "მილიმეტრი"),
    numberAttr(categorySlug, OUTER_DIAMETER, "მილიმეტრი"),
    numberAttr(categorySlug, WIDTH, "მილიმეტრი"),
  ];
}

const VOLTAGE: Label = ["ძაბვა", "Voltage", "Напряжение"];
const LENGTH_MM: Label = ["სიგრძე", "Length", "Длина"];
const DIAMETER_MM: Label = ["დიამეტრი", "Diameter", "Диаметр"];
const ADJUSTABLE: Label = ["რეგულირებადი", "Adjustable", "Регулируемый"];
const HEATED: Label = ["გათბობით", "Heated", "С подогревом"];
const WATERPROOF: Label = ["წყალგამძლეობა", "Waterproof", "Водонепроницаемость"];
const VENTILATION: Label = ["ვენტილაცია", "Ventilation", "Вентиляция"];
const THERMAL_LINER: Label = ["მოსახსნელი თბილი სარჩული", "Removable Thermal Liner", "Съёмная утепляющая подкладка"];
const REFLECTIVE: Label = ["არეკვლადი ელემენტები", "Reflective Elements", "Светоотражающие элементы"];

const CATALOG_ATTRIBUTE_SEEDS: AttributeSeed[] = [
  // ── Helmets & helmet accessories ──
  booleanAttr("helmets", ["შიდა მზის ვიზორი", "Internal Sun Visor", "Внутренний солнцезащитный визор"]),
  booleanAttr("helmets", ["Pinlock-ის მზადყოფნა", "Pinlock Ready", "Подготовка под Pinlock"]),
  booleanAttr("helmets", ["ინტერკომის მზადყოფნა", "Intercom Ready", "Подготовка под гарнитуру"]),
  numberAttr("intercoms", ["მოქმედების რადიუსი", "Range", "Дальность"], "მეტრი"),
  numberAttr("intercoms", ["მონაწილეების მაქს. რაოდენობა", "Max. Riders", "Макс. участников"]),
  numberAttr("intercoms", ["საუბრის დრო", "Talk Time", "Время разговора"], "საათი"),
  booleanAttr("intercoms", ["Mesh კავშირი", "Mesh Intercom", "Mesh-связь"]),
  selectAttr("helmet-visor", TINT, TINT_OPTIONS),
  booleanAttr("helmet-visor", ["Pinlock-თან თავსებადი", "Pinlock Compatible", "Совместим с Pinlock"]),
  selectAttr("pinlock", TINT, TINT_OPTIONS),
  selectAttr("pinlock", ["Pinlock-ის ტიპი", "Pinlock Type", "Тип Pinlock"], codeOptions("Pinlock 30", "Pinlock 70", "Pinlock 120")),
  selectAttr("balaclavas", ["მასალა", "Material", "Материал"], [
    option("COTTON", "ბამბა", "Cotton", "Хлопок"),
    option("SILK", "აბრეშუმი", "Silk", "Шёлк"),
    option("MERINO", "მერინოს მატყლი", "Merino Wool", "Шерсть мериноса"),
    option("SYNTHETIC", "სინთეტიკა", "Synthetic", "Синтетика"),
    option("FLEECE", "ფლისი", "Fleece", "Флис"),
  ]),
  selectAttr("goggles", TINT, TINT_OPTIONS),
  booleanAttr("goggles", ["Tear-off-ის მზადყოფნა", "Tear-off Ready", "Подготовка под срывки"]),
  numberAttr("helmet-care", ["მოცულობა", "Volume", "Объём"], "მილილიტრი"),

  // ── Riding gear ──
  selectAttr("gear", ["სქესი", "Gender", "Пол"], [
    option("MEN", "კაცის", "Men's", "Мужской"),
    option("WOMEN", "ქალის", "Women's", "Женский"),
    option("UNISEX", "უნისექსი", "Unisex", "Унисекс"),
    option("KIDS", "ბავშვის", "Kids'", "Детский"),
  ]),
  selectAttr("gear", ["სტილი", "Style", "Стиль"], [
    option("SPORT", "სპორტი", "Sport", "Спорт"),
    option("TOURING", "ტური", "Touring", "Туризм"),
    option("URBAN", "ქალაქი", "Urban", "Город"),
    option("ADVENTURE", "ადვენჩერი", "Adventure", "Эндуро-туризм"),
    option("OFFROAD", "ოფროუდი / კროსი", "Off-road / MX", "Off-road / Кросс"),
    option("CRUISER", "კრუიზერი", "Cruiser", "Круизер"),
  ]),
  ...["jackets", "pants", "riding-suits"].flatMap((slug) => [
    booleanAttr(slug, VENTILATION),
    booleanAttr(slug, THERMAL_LINER),
    booleanAttr(slug, REFLECTIVE),
  ]),
  booleanAttr("gloves", ["სენსორული ეკრანის თითი", "Touchscreen Fingertip", "Сенсорный палец"]),
  booleanAttr("gloves", HEATED),
  selectAttr("protection", ["ტიპი", "Type", "Тип"], [
    option("BACK", "ზურგის", "Back", "Спина"),
    option("CHEST", "მკერდის", "Chest", "Грудь"),
    option("SHOULDER", "მხრის", "Shoulder", "Плечи"),
    option("ELBOW", "იდაყვის", "Elbow", "Локти"),
    option("KNEE", "მუხლის", "Knee", "Колени"),
    option("HIP", "თეძოს", "Hip", "Бёдра"),
    option("NECK_BRACE", "კისრის", "Neck Brace", "Шея"),
    option("BODY_ARMOR", "სრული (ჯავშან-ჟილეტი)", "Body Armor", "Моточерепаха"),
  ]),
  selectAttr("protection", ["სერტიფიკატი (EN 1621)", "Certification (EN 1621)", "Сертификат (EN 1621)"], [
    option("NONE", "არ აქვს", "None", "Нет"),
    option("LEVEL_1", "დონე 1", "Level 1", "Уровень 1"),
    option("LEVEL_2", "დონე 2", "Level 2", "Уровень 2"),
  ]),
  selectAttr("rain-gear", ["ტიპი", "Type", "Тип"], [
    option("JACKET", "ქურთუკი", "Jacket", "Куртка"),
    option("PANTS", "შარვალი", "Pants", "Брюки"),
    option("SUIT", "კომბინიზონი", "One-piece Suit", "Комбинезон"),
    option("OVERBOOTS", "ფეხსაცმლის ჩასაცმელი", "Overboots", "Бахилы"),
    option("OVERGLOVES", "ხელთათმანის ჩასაცმელი", "Overgloves", "Дождевые перчатки"),
  ]),
  selectAttr("boots", ["ტიპი", "Type", "Тип"], [
    option("SPORT", "სპორტული", "Sport", "Спортивные"),
    option("TOURING", "ტურისტული", "Touring", "Туристические"),
    option("ADVENTURE", "ადვენჩერი", "Adventure", "Эндуро-туризм"),
    option("MX", "კროსის", "MX / Off-road", "Кроссовые"),
    option("URBAN", "საქალაქო", "Urban", "Городские"),
  ]),
  selectAttr("apparel", ["ტიპი", "Type", "Тип"], [
    option("TSHIRT", "მაისური", "T-shirt", "Футболка"),
    option("HOODIE", "ჰუდი / სვიტერი", "Hoodie / Sweatshirt", "Худи / свитшот"),
    option("CASUAL_JACKET", "ქურთუკი (ყოველდღიური)", "Casual Jacket", "Куртка (повседневная)"),
    option("CAP", "ქუდი / კეპი", "Cap / Beanie", "Кепка / шапка"),
    option("OTHER", "სხვა", "Other", "Другое"),
  ]),
  selectAttr("luggage", ["ტიპი", "Type", "Тип"], [
    option("TOP_CASE", "კოფრი (უკანა)", "Top Case", "Кофр центральный"),
    option("SIDE_CASES", "გვერდითი კოფრები", "Side Cases", "Боковые кофры"),
    option("SADDLEBAGS", "გვერდითი ჩანთები", "Saddlebags", "Боковые сумки"),
    option("TANK_BAG", "ავზის ჩანთა", "Tank Bag", "Сумка на бак"),
    option("TAIL_BAG", "უკანა ჩანთა", "Tail Bag", "Сумка на хвост"),
    option("BACKPACK", "ზურგჩანთა", "Backpack", "Рюкзак"),
    option("MOUNTING", "სამონტაჟო ჩარჩო / ფირფიტა", "Mounting Rack / Plate", "Крепёжная рама / площадка"),
  ]),
  booleanAttr("luggage", ["საკეტით", "Lockable", "С замком"]),

  // ── Accessories ──
  selectAttr("phone-mounts", ["დამაგრების ადგილი", "Mounting Point", "Место крепления"], [
    option("HANDLEBAR", "საჭე", "Handlebar", "Руль"),
    option("MIRROR", "სარკის ღერო", "Mirror Stem", "Крепление зеркала"),
    option("STEM", "საჭის ცენტრი (ტრავერსი)", "Fork Stem", "Траверса"),
    option("TANK", "ავზი", "Tank", "Бак"),
  ]),
  booleanAttr("phone-mounts", ["უსადენო დამუხტვა", "Wireless Charging", "Беспроводная зарядка"]),
  booleanAttr("phone-mounts", ["ვიბრაციის დემპფერი", "Vibration Dampener", "Демпфер вибраций"]),
  selectAttr("phone-chargers", ["კონექტორი", "Connector", "Разъём"], codeOptions("USB-A", "USB-C", "USB-A + USB-C", "SAE")),
  numberAttr("phone-chargers", ["სიმძლავრე", "Power", "Мощность"], "ვატი"),
  booleanAttr("phone-chargers", WATERPROOF),
  numberAttr("gps-navigators", ["ეკრანის ზომა", "Screen Size", "Размер экрана"], "დიუმი"),
  booleanAttr("gps-navigators", WATERPROOF),
  selectAttr("security", ["უსაფრთხოების სერტიფიკატი", "Security Rating", "Сертификат безопасности"], [
    option("NONE", "არ აქვს", "None", "Нет"),
    ...codeOptions("Sold Secure Bronze", "Sold Secure Silver", "Sold Secure Gold", "Sold Secure Diamond", "SRA", "Thatcham"),
  ]),
  selectAttr("locks", ["ტიპი", "Type", "Тип"], [
    option("CHAIN", "ჯაჭვი", "Chain", "Цепь"),
    option("U_LOCK", "U-საკეტი", "U-Lock", "U-образный"),
    option("CABLE", "ტროსი", "Cable", "Трос"),
    option("PADLOCK", "ბოქლომი", "Padlock", "Навесной замок"),
  ]),
  numberAttr("locks", LENGTH_MM, "სანტიმეტრი"),
  numberAttr("locks", ["რგოლის/ღეროს სისქე", "Link/Shackle Thickness", "Толщина звена/дужки"], "მილიმეტრი"),
  numberAttr("disc-locks", ["ღეროს დიამეტრი", "Pin Diameter", "Диаметр штифта"], "მილიმეტრი"),
  booleanAttr("disc-locks", ["სიგნალიზაციით", "With Alarm", "С сигнализацией"]),
  booleanAttr("alarms", ["GPS ტრეკერი", "GPS Tracker", "GPS-трекер"]),
  booleanAttr("alarms", ["მობილური აპლიკაცია", "Mobile App", "Мобильное приложение"]),
  booleanAttr("alarms", ["დისტანციური პულტი", "Remote Control", "Брелок управления"]),
  selectAttr("bike-covers", ["გამოყენება", "Use", "Использование"], [
    option("INDOOR", "შიდა", "Indoor", "Для помещения"),
    option("OUTDOOR", "გარე", "Outdoor", "Уличный"),
  ]),
  booleanAttr("bike-covers", WATERPROOF),
  numberAttr("wrenches", ["ზომა", "Size", "Размер"], "მილიმეტრი"),
  numberAttr("tools", ["ნაწილების რაოდენობა კომპლექტში", "Pieces in Set", "Предметов в наборе"]),
  numberAttr("puzzles", ["ნაწილების რაოდენობა", "Pieces", "Количество элементов"]),
  selectAttr("scale-models", ["მასშტაბი", "Scale", "Масштаб"], codeOptions("1:6", "1:12", "1:18", "1:24", "1:32")),

  // ── Oils & care products ──
  selectAttr("engine-oil", ["სიბლანტე", "Viscosity", "Вязкость"],
    codeOptions("5W-30", "5W-40", "10W-30", "10W-40", "10W-50", "10W-60", "15W-50", "20W-50")),
  selectAttr("engine-oil", ["ბაზა", "Base", "Основа"], [
    option("SYNTHETIC", "სინთეტიკური", "Synthetic", "Синтетическое"),
    option("SEMI_SYNTHETIC", "ნახევრად სინთეტიკური", "Semi-synthetic", "Полусинтетическое"),
    option("MINERAL", "მინერალური", "Mineral", "Минеральное"),
  ]),
  selectAttr("engine-oil", ["ძრავის ტიპი", "Engine Type", "Тип двигателя"], [
    option("FOUR_STROKE", "4-ტაქტიანი", "4-stroke", "4-тактный"),
    option("TWO_STROKE", "2-ტაქტიანი", "2-stroke", "2-тактный"),
  ]),
  selectAttr("engine-oil", ["სტანდარტი (JASO)", "Standard (JASO)", "Стандарт (JASO)"],
    codeOptions("JASO MA", "JASO MA2", "JASO MB", "JASO FC", "JASO FD")),
  selectAttr("fork-oil", ["სიბლანტე", "Viscosity", "Вязкость"], codeOptions("2.5W", "5W", "7.5W", "10W", "15W", "20W")),
  ...["chain-cleaners", "chain-lubes"].map((slug) =>
    selectAttr(slug, ["ფორმა", "Form", "Форма"], [
      option("SPRAY", "სპრეი", "Spray", "Спрей"),
      option("LIQUID", "სითხე", "Liquid", "Жидкость"),
      option("PASTE", "პასტა / გელი", "Paste / Gel", "Паста / гель"),
    ]),
  ),
  selectAttr("chain-lubes", ["დანიშნულება", "Use", "Назначение"], [
    option("ROAD", "გზა", "Road", "Дорога"),
    option("OFFROAD", "ოფროუდი", "Off-road", "Бездорожье"),
    option("RACING", "რბოლა", "Racing", "Гонки"),
  ]),
  selectAttr("antifreeze", ["ტიპი", "Type", "Тип"], [
    option("READY", "მზა", "Ready-to-use", "Готовый"),
    option("CONCENTRATE", "კონცენტრატი", "Concentrate", "Концентрат"),
  ]),

  // ── Spare parts (whole branch) ──
  textAttr("parts", ["ნაწილის კოდი (Part number)", "Part Number", "Артикул (Part number)"]),
  selectAttr("air-filters", ["ფილტრის მასალა", "Filter Media", "Материал фильтра"], [
    option("PAPER", "ქაღალდი", "Paper", "Бумага"),
    option("COTTON_GAUZE", "ბამბის ქსოვილი", "Cotton Gauze", "Хлопковая марля"),
    option("FOAM", "ღრუბელი", "Foam", "Поролон"),
  ]),
  booleanAttr("air-filters", ["რეცხვადი (მრავალჯერადი)", "Washable (Reusable)", "Моющийся (многоразовый)"]),
  selectAttr("brake-pads", POSITION, POSITION_OPTIONS),
  selectAttr("spark-plugs", ["ელექტროდი", "Electrode", "Электрод"], [
    option("STANDARD", "სტანდარტული (ნიკელი)", "Standard (Nickel)", "Стандартный (никель)"),
    option("IRIDIUM", "ირიდიუმი", "Iridium", "Иридий"),
    option("PLATINUM", "პლატინა", "Platinum", "Платина"),
  ]),
  numberAttr("spark-plugs", ["სითბური რიცხვი", "Heat Range", "Калильное число"]),
  selectAttr("spark-plugs", ["ხრახნის ზომა", "Thread Size", "Размер резьбы"], codeOptions("M10", "M12", "M14")),
  numberAttr("batteries", VOLTAGE, "ვოლტი"),
  numberAttr("batteries", ["გაშვების დენი (CCA)", "Cold Cranking Amps (CCA)", "Пусковой ток (CCA)"], "ამპერი"),
  selectAttr("batteries", ["პოლარობა", "Polarity", "Полярность"], [
    option("LEFT_PLUS", "+ მარცხნივ", "+ Left", "+ слева"),
    option("RIGHT_PLUS", "+ მარჯვნივ", "+ Right", "+ справа"),
  ]),
  textAttr("batteries", ["ზომები (ს×ს×ს მმ)", "Dimensions (L×W×H mm)", "Размеры (Д×Ш×В мм)"]),
  booleanAttr("batteries", ["მოვლას არ საჭიროებს", "Maintenance-free", "Необслуживаемый"]),
  numberAttr("battery-chargers", ["გამომავალი დენი", "Output Current", "Выходной ток"], "ამპერი"),
  selectAttr("battery-chargers", VOLTAGE, codeOptions("6V", "12V", "6V / 12V")),
  booleanAttr("battery-chargers", ["ლითიუმის აკუმულატორის რეჟიმი", "Lithium Battery Mode", "Режим для литиевых АКБ"]),
  selectAttr("chains-sprockets", ["ტიპი", "Type", "Тип"], [
    option("CHAIN", "ჯაჭვი", "Chain", "Цепь"),
    option("FRONT_SPROCKET", "წინა კბილანა", "Front Sprocket", "Ведущая звезда"),
    option("REAR_SPROCKET", "უკანა კბილანა", "Rear Sprocket", "Ведомая звезда"),
    option("KIT", "კომპლექტი (ჯაჭვი + კბილანები)", "Kit (Chain + Sprockets)", "Комплект (цепь + звёзды)"),
  ]),
  selectAttr("chains-sprockets", ["ბიჯი", "Pitch", "Шаг"], codeOptions("415", "420", "428", "520", "525", "530", "532")),
  numberAttr("chains-sprockets", ["რგოლების რაოდენობა", "Links", "Количество звеньев"]),
  numberAttr("chains-sprockets", ["კბილების რაოდენობა", "Teeth", "Количество зубьев"]),
  selectAttr("chains-sprockets", ["ჯაჭვის დალუქვა", "Chain Seal", "Уплотнение цепи"], [
    option("STANDARD", "სტანდარტული (დალუქვის გარეშე)", "Standard (Non-sealed)", "Стандартная (без сальников)"),
    ...codeOptions("O-ring", "X-ring", "Z-ring"),
  ]),
  selectAttr("chains-sprockets", ["კბილანის მასალა", "Sprocket Material", "Материал звезды"], [
    option("STEEL", "ფოლადი", "Steel", "Сталь"),
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
  ]),
  ...dimensionAttrs("fork-seals"),
  selectAttr("clutch-plates", ["ტიპი", "Type", "Тип"], [
    option("FRICTION", "ფრიქციული", "Friction", "Фрикционные"),
    option("STEEL", "ფოლადის", "Steel", "Стальные"),
    option("KIT", "კომპლექტი", "Kit", "Комплект"),
  ]),
  numberAttr("clutch-plates", ["ფირფიტების რაოდენობა", "Number of Plates", "Количество дисков"]),
  numberAttr("electrical", VOLTAGE, "ვოლტი"),
  numberAttr("relays", ["კონტაქტების რაოდენობა", "Number of Pins", "Количество контактов"]),
  selectAttr("radiators", ["მასალა", "Material", "Материал"], [
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
    option("COPPER", "სპილენძი", "Copper", "Медь"),
  ]),
  numberAttr("radiator-caps", ["გახსნის წნევა", "Opening Pressure", "Давление открытия"], "ბარი"),
  selectAttr("coolant-hoses", ["მასალა", "Material", "Материал"], [
    option("SILICONE", "სილიკონი", "Silicone", "Силикон"),
    option("RUBBER", "რეზინი", "Rubber", "Резина"),
  ]),
  numberAttr("coolant-hoses", INNER_DIAMETER, "მილიმეტრი"),
  numberAttr("cooling-fans", VOLTAGE, "ვოლტი"),
  numberAttr("cooling-fans", DIAMETER_MM, "მილიმეტრი"),
  selectAttr("exhaust", ["ჰომოლოგაცია", "Homologation", "Омологация"], [
    option("E_MARK", "E-ნიშანი (ქუჩისთვის)", "E-marked (Road Legal)", "E-маркировка (для дорог)"),
    option("RACE", "მხოლოდ ტრეკისთვის", "Race Only", "Только для трека"),
  ]),
  numberAttr("exhaust", ["მილის დიამეტრი", "Pipe Diameter", "Диаметр трубы"], "მილიმეტრი"),
  numberAttr("exhaust-wrap", ["რულონის სიგრძე", "Roll Length", "Длина рулона"], "მეტრი"),
  numberAttr("exhaust-wrap", ["ლენტის სიგანე", "Tape Width", "Ширина ленты"], "მილიმეტრი"),
  ...["front-forks", "rear-shocks"].flatMap((slug) => [
    numberAttr(slug, LENGTH_MM, "მილიმეტრი"),
    selectAttr(slug, ["რეგულირება", "Adjustment", "Регулировка"], [
      option("NONE", "არარეგულირებადი", "Non-adjustable", "Нерегулируемый"),
      option("PRELOAD", "წინასწარი დაჭიმულობა", "Preload", "Преднатяг"),
      option("PRELOAD_REBOUND", "დაჭიმულობა + უკუსვლა", "Preload + Rebound", "Преднатяг + отбой"),
      option("FULL", "სრული", "Fully Adjustable", "Полная"),
    ]),
  ]),
  selectAttr("rear-shocks", ["ტიპი", "Type", "Тип"], [
    option("MONO", "მონოამორტიზატორი", "Monoshock", "Моноамортизатор"),
    option("TWIN", "წყვილი", "Twin Shocks", "Парные"),
  ]),
  ...dimensionAttrs("bearings"),
  ...dimensionAttrs("bushings"),
  ...dimensionAttrs("seals"),
  selectAttr("triple-clamps", ["მასალა", "Material", "Материал"], [
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
    option("STEEL", "ფოლადი", "Steel", "Сталь"),
  ]),
  selectAttr("handlebars", HANDLEBAR_DIAMETER, HANDLEBAR_DIAMETER_OPTIONS),
  selectAttr("handlebars", ["ტიპი", "Type", "Тип"], [
    option("HANDLEBAR", "საჭე", "Handlebar", "Руль"),
    option("CLIP_ON", "კლიპონი", "Clip-on", "Клипон"),
  ]),
  selectAttr("handlebars", ["მასალა", "Material", "Материал"], [
    option("STEEL", "ფოლადი", "Steel", "Сталь"),
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
  ]),
  selectAttr("grips", HANDLEBAR_DIAMETER, HANDLEBAR_DIAMETER_OPTIONS),
  booleanAttr("grips", HEATED),
  selectAttr("levers", ["ბერკეტი", "Lever", "Рычаг"], [
    option("CLUTCH", "გადაბმულობის (მარცხენა)", "Clutch (Left)", "Сцепления (левый)"),
    option("BRAKE", "მუხრუჭის (მარჯვენა)", "Brake (Right)", "Тормоза (правый)"),
    option("PAIR", "წყვილი", "Pair", "Пара"),
  ]),
  booleanAttr("levers", ADJUSTABLE),
  booleanAttr("levers", ["დასაკეცი", "Folding", "Складной"]),
  selectAttr("mirrors", SIDE, SIDE_OPTIONS),
  selectAttr("mirrors", ["ხრახნის ზომა", "Thread Size", "Размер резьбы"], [...codeOptions("M8", "M10"), option("M10_LEFT", "M10 (უკუხრახნი)", "M10 (Left-hand Thread)", "M10 (левая резьба)")]),
  booleanAttr("mirrors", ["საჭის ბოლოზე (bar-end)", "Bar-end", "Торцевое (bar-end)"]),
  selectAttr("hand-guards", ["ტიპი", "Type", "Тип"], [
    option("OPEN", "ღია (ქარისგან)", "Open (Wind Deflector)", "Открытые (от ветра)"),
    option("WRAP_AROUND", "დახურული (ალუმინის ჩარჩოთი)", "Wrap-around (Aluminum Backbone)", "Закрытые (с алюминиевой основой)"),
  ]),
  booleanAttr("steering-dampers", ADJUSTABLE),
  selectAttr("brakes", POSITION, POSITION_OPTIONS),
  numberAttr("brake-discs", DIAMETER_MM, "მილიმეტრი"),
  selectAttr("brake-discs", ["ტიპი", "Type", "Тип"], [
    option("FIXED", "ფიქსირებული", "Fixed", "Неплавающий"),
    option("FLOATING", "მცურავი", "Floating", "Плавающий"),
  ]),
  booleanAttr("brake-discs", ["ტალღოვანი (Wave)", "Wave", "Волновой (Wave)"]),
  selectAttr("brake-lines", ["ტიპი", "Type", "Тип"], [
    option("BRAIDED", "არმირებული (ფოლადის წნული)", "Braided Steel", "Армированный (стальная оплётка)"),
    option("RUBBER", "რეზინის", "Rubber", "Резиновый"),
    option("CABLE", "ტროსი", "Cable", "Трос"),
  ]),
  numberAttr("brake-calipers", ["დგუშების რაოდენობა", "Number of Pistons", "Количество поршней"]),
  selectAttr("brake-calipers", ["მონტაჟი", "Mounting", "Крепление"], [
    option("AXIAL", "აქსიალური", "Axial", "Аксиальное"),
    option("RADIAL", "რადიალური", "Radial", "Радиальное"),
  ]),
  selectAttr("master-cylinders", ["ტიპი", "Type", "Тип"], [
    option("AXIAL", "აქსიალური", "Axial", "Аксиальный"),
    option("RADIAL", "რადიალური", "Radial", "Радиальный"),
  ]),
  numberAttr("master-cylinders", ["დგუშის დიამეტრი", "Piston Diameter", "Диаметр поршня"], "მილიმეტრი"),
  textAttr("bolts", ["ხრახნი", "Thread", "Резьба"]),
  numberAttr("bolts", LENGTH_MM, "მილიმეტრი"),
  selectAttr("bolts", ["მასალა", "Material", "Материал"], [
    option("STEEL", "ფოლადი", "Steel", "Сталь"),
    option("STAINLESS", "უჟანგავი ფოლადი", "Stainless Steel", "Нержавеющая сталь"),
    option("TITANIUM", "ტიტანი", "Titanium", "Титан"),
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
  ]),
  selectAttr("body-parts", ["მასალა", "Material", "Материал"], [
    option("ABS", "ABS პლასტიკი", "ABS Plastic", "ABS-пластик"),
    option("POLYCARBONATE", "პოლიკარბონატი", "Polycarbonate", "Поликарбонат"),
    option("ACRYLIC", "აკრილი", "Acrylic", "Акрил"),
    option("CARBON", "კარბონი", "Carbon", "Карбон"),
    option("ALUMINUM", "ალუმინი", "Aluminum", "Алюминий"),
    option("STEEL", "ფოლადი", "Steel", "Сталь"),
  ]),
  numberAttr("windscreens", ["სიმაღლე", "Height", "Высота"], "მილიმეტრი"),
  selectAttr("windscreens", TINT, TINT_OPTIONS.filter((tint) => ["CLEAR", "LIGHT_SMOKE", "DARK_SMOKE"].includes(tint.key))),
  booleanAttr("body-kits", ["შეღებილი", "Painted", "Окрашенный"]),
  selectAttr("motorcycle-seats", ["ტიპი", "Type", "Тип"], [
    option("COMFORT", "კომფორტული", "Comfort", "Комфортное"),
    option("LOW", "დაბალი", "Low", "Заниженное"),
    option("SPORT", "სპორტული", "Sport", "Спортивное"),
    option("SOLO", "ერთადგილიანი", "Solo", "Одноместное"),
  ]),
  booleanAttr("motorcycle-seats", HEATED),
  selectAttr("seat-covers", ["მასალა", "Material", "Материал"], [
    option("LEATHER", "ტყავი", "Leather", "Кожа"),
    option("ECO_LEATHER", "ეკო-ტყავი", "Faux Leather", "Экокожа"),
    option("MESH", "3D ბადე", "3D Mesh", "3D-сетка"),
    option("GEL", "გელი", "Gel", "Гель"),
  ]),

  // ── Tires ── ("ზომა" stays the full printed size, e.g. 120/70 ZR17;
  // these split it out so it can be filtered.)
  numberAttr("tires", ["სიგანე", "Width", "Ширина"], "მილიმეტრი"),
  numberAttr("tires", ["პროფილი", "Aspect Ratio", "Профиль"], "პროცენტი"),
  numberAttr("tires", ["დისკის დიამეტრი", "Rim Diameter", "Диаметр диска"], "დიუმი"),
  selectAttr("tires", POSITION, POSITION_OPTIONS),
  numberAttr("tires", ["დატვირთვის ინდექსი", "Load Index", "Индекс нагрузки"]),
  selectAttr("tires", ["სიჩქარის ინდექსი", "Speed Rating", "Индекс скорости"],
    codeOptions("J", "L", "M", "N", "P", "Q", "R", "S", "T", "H", "V", "W", "ZR")),
  selectAttr("tires", ["კამერა", "Tube Type", "Камера"], [
    option("TL", "უკამერო (TL)", "Tubeless (TL)", "Бескамерная (TL)"),
    option("TT", "კამერიანი (TT)", "Tube Type (TT)", "Камерная (TT)"),
  ]),
  selectAttr("tires", ["დანიშნულება", "Use", "Назначение"], [
    option("SPORT", "სპორტი", "Sport", "Спорт"),
    option("ROAD", "გზა", "Road", "Дорога"),
    option("TOURING", "ტური", "Touring", "Туризм"),
    option("ADVENTURE", "ადვენჩერი", "Adventure", "Эндуро-туризм"),
    option("OFFROAD", "ოფროუდი / კროსი", "Off-road / MX", "Бездорожье / кросс"),
    option("SCOOTER", "სკუტერი", "Scooter", "Скутер"),
  ]),
];

async function seedAttributes(categoryIdBySlug: Map<string, number>, unitIdByNameKa: Map<string, number>) {
  for (const attributeSeed of [...ATTRIBUTE_SEEDS, ...CATALOG_ATTRIBUTE_SEEDS]) {
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
  console.log(`Attributes ready: ${ATTRIBUTE_SEEDS.length + CATALOG_ATTRIBUTE_SEEDS.length}`);
}

type ProductBrandSeed = {
  categorySlugs: string[];
  name: string;
  slug: string;
};

// Client-supplied "moto_brands_by_category.csv" (2026-11) — one row per
// (category, subcategory, product type, brand), so a brand selling several
// unrelated product types (e.g. Alpinestars: gloves, jackets, helmets AND
// boots) lists every leaf category it actually appears under, not one
// parent category to inherit from (a brand attached to a leaf is NOT
// automatically available for sibling leaves — see
// product-brands.service.ts's listProductBrands, which still inherits
// upward from a product's own category to its ancestors, just now checking
// "any of this brand's categories" instead of one). A few brands outside
// the CSV's scope (tires, security, the broader brake-system category —
// distinct from wear-parts' brake pads) are kept as they were; everything
// the CSV does cover replaces the old single-category seed list below it.
const PRODUCT_BRAND_SEEDS: ProductBrandSeed[] = [
  // Helmets — general brands (helmet shells, visors, pinlock inserts).
  ...[
    "Premier",
    "LS2",
    "HJC",
    "MT Helmets",
    "Shark",
    "AGV",
    "Nolan",
    "Speeds",
    "NZI",
    "GSB",
    "Bottari",
    "Virtue",
    "Cool Seven",
  ].map((name) => ({ name, categorySlugs: ["helmets", "helmet-visor", "pinlock"] })),
  { name: "Sena", categorySlugs: ["intercoms"] },
  { name: "Cardo", categorySlugs: ["intercoms"] },
  { name: "Motul", categorySlugs: ["helmet-care", "engine-oil", "chain-lubes"] },

  // Riding gear.
  {
    name: "Atrox",
    categorySlugs: [
      "balaclavas",
      "jackets",
      "gloves",
      "pants",
      "riding-suits",
      "protection",
      "rain-gear",
      "boots",
      "luggage",
    ],
  },
  {
    name: "Alpinestars",
    categorySlugs: ["balaclavas", "jackets", "gloves", "pants", "riding-suits", "boots"],
  },
  { name: "Modeka", categorySlugs: ["jackets", "gloves", "pants", "boots"] },
  // Also sells helmets/visors/pinlock (part of the helmet-brand list above) —
  // one entry, not two, since both slugify to "icon" and a second upsert
  // would wipe the first's category links (deleteMany on update).
  { name: "Icon", categorySlugs: ["helmets", "helmet-visor", "pinlock", "gloves"] },
  ...["Suomy", "Pro-Biker", "Prosev", "Dainese", "Crivit"].map((name) => ({
    name,
    categorySlugs: ["gloves"],
  })),

  // Oils & care products.
  ...["BMW", "Shell", "Amsoil"].map((name) => ({ name, categorySlugs: ["engine-oil"] })),
  {
    name: "Bardahl",
    categorySlugs: [
      "engine-oil",
      "fork-oil",
      "engine-cleaners",
      "fuel-system-cleaners",
      "cooling-system-cleaners",
      "antifreeze",
    ],
  },
  { name: "Eni", categorySlugs: ["engine-oil", "fork-oil"] },
  { name: "Mannol", categorySlugs: ["chain-cleaners", "antifreeze"] },
  { name: "Würth", slug: "wurth", categorySlugs: ["chain-cleaners"] },
  { name: "Wunsher", categorySlugs: ["chain-cleaners"] },
  { name: "Bardahl Professional", categorySlugs: ["chain-lubes"] },

  // Filters.
  ...["K&N", "HiFlo"].map((name) => ({ name, categorySlugs: ["air-filters", "oil-filters"] })),
  { name: "Mann", categorySlugs: ["oil-filters"] },

  // Wear parts.
  ...["Newfren", "EBC"].map((name) => ({ name, categorySlugs: ["brake-pads", "clutch-plates"] })),
  { name: "WRP", categorySlugs: ["brake-pads"] },
  ...["NGK", "Brisk"].map((name) => ({ name, categorySlugs: ["spark-plugs"] })),
  ...["Delta", "Kage", "Zubr"].map((name) => ({ name, categorySlugs: ["batteries"] })),
  ...["JT", "RK"].map((name) => ({ name, categorySlugs: ["chains-sprockets"] })),

  // Outside the CSV's scope (tires, security, the broader brake-system
  // category) — unchanged from before.
  { name: "Xena", categorySlugs: ["security"] },
  { name: "Michelin", categorySlugs: ["tires"] },
  { name: "Pirelli", categorySlugs: ["tires"] },
  { name: "Dunlop", categorySlugs: ["tires"] },
  { name: "Brembo", categorySlugs: ["brakes"] },
].map((seed) => ({
  ...seed,
  slug: "slug" in seed && seed.slug ? seed.slug : slugify(seed.name),
}));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedProductBrands(categoryIdBySlug: Map<string, number>) {
  for (const brandSeed of PRODUCT_BRAND_SEEDS) {
    const categoryIds = brandSeed.categorySlugs.map((slug) => {
      const categoryId = categoryIdBySlug.get(slug);
      if (!categoryId) {
        throw new Error(`Unknown category slug in product brand seed: ${slug}`);
      }
      return categoryId;
    });

    // Re-running always syncs this brand's category set to the seed's
    // definition (the catalog CSV is the source of truth for which
    // categories a known brand sells into) — but never touches name/slug/
    // logoUrl once created, so admin edits to those survive a reseed.
    await prisma.productBrand.upsert({
      where: { slug: brandSeed.slug },
      update: {
        categories: {
          deleteMany: {},
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
      create: {
        name: brandSeed.name,
        slug: brandSeed.slug,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
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
  ...(
    [
      ["tires", "tires", "დანიშნულება", 3],
      ["tires", "tires", "პოზიცია", 4],
      ["tires", "tires", "დისკის დიამეტრი", 5],
      ["tires", "tires", "სიგანე", 6],
      ["engine-oil", "engine-oil", "სიბლანტე", 2],
      ["engine-oil", "engine-oil", "ბაზა", 3],
      ["engine-oil", "engine-oil", "ძრავის ტიპი", 4],
      ["chains-sprockets", "chains-sprockets", "ტიპი", 2],
      ["chains-sprockets", "chains-sprockets", "ბიჯი", 3],
      ["batteries", "batteries", "ტიპი", 2],
      ["batteries", "batteries", "ძაბვა", 3],
      ["luggage", "luggage", "ტიპი", 2],
    ] as const
  ).map(
    ([categorySlug, definingCategorySlug, attributeNameKa, sortOrder]): CategoryFilterSeed => ({
      categorySlug,
      filterType: "ATTRIBUTE",
      definingCategorySlug,
      attributeNameKa,
      sortOrder,
    }),
  ),
  // Spare parts and oils had no filter panel at all — price and brand on the
  // root, inherited by every subcategory.
  { categorySlug: "parts", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "parts", filterType: "BRAND", sortOrder: 1 },
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
  // Electric stand-up scooters — battery/motor specs, no engine or fuel.
  { categorySlug: "scooters", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "scooters", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "scooters", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "MOTOR_POWER_WATT", sortOrder: 3 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "RANGE_KM", sortOrder: 4 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "TOP_SPEED_KMH", sortOrder: 5 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "BATTERY_CAPACITY_WH", sortOrder: 6 },
  { categorySlug: "scooters", filterType: "SPEC", specField: "WEIGHT_KG", sortOrder: 7 },
  { categorySlug: "mopeds", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "mopeds", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "mopeds", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "mopeds", filterType: "SPEC", specField: "FUEL_TYPE", sortOrder: 3 },
  { categorySlug: "mopeds", filterType: "SPEC", specField: "ENGINE_VOLUME_CC", sortOrder: 4 },
  { categorySlug: "mopeds", filterType: "SPEC", specField: "TOP_SPEED_KMH", sortOrder: 5 },
  // Mopeds and trikes come both petrol and electric: "fuel type" includes
  // ELECTRIC, and the electric specs below only show once such listings
  // exist (an empty or uniform spec is hidden in the shop).
  { categorySlug: "mopeds", filterType: "SPEC", specField: "MOTOR_POWER_WATT", sortOrder: 6 },
  { categorySlug: "mopeds", filterType: "SPEC", specField: "RANGE_KM", sortOrder: 7 },
  { categorySlug: "mopeds", filterType: "SPEC", specField: "BATTERY_CAPACITY_WH", sortOrder: 8 },
  { categorySlug: "trikes", filterType: "PRICE", sortOrder: 0 },
  { categorySlug: "trikes", filterType: "YEAR", sortOrder: 1 },
  { categorySlug: "trikes", filterType: "BRAND", sortOrder: 2 },
  { categorySlug: "trikes", filterType: "SPEC", specField: "FUEL_TYPE", sortOrder: 3 },
  { categorySlug: "trikes", filterType: "SPEC", specField: "ENGINE_VOLUME_CC", sortOrder: 4 },
  { categorySlug: "trikes", filterType: "SPEC", specField: "MOTOR_POWER_WATT", sortOrder: 5 },
  { categorySlug: "trikes", filterType: "SPEC", specField: "RANGE_KM", sortOrder: 6 },
  { categorySlug: "trikes", filterType: "SPEC", specField: "BATTERY_CAPACITY_WH", sortOrder: 7 },
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

  const operatorRole = await prisma.role.upsert({
    where: { name: ROLES.OPERATOR },
    update: {},
    create: { name: ROLES.OPERATOR },
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
        // An admin account is never expected to go through the public
        // registration+email-verification flow — leaving this null used to
        // trip the storefront's /account emailVerified gate (see Header.tsx's
        // account-dropdown link, which now routes ADMIN users to /admin
        // instead of /account, but this is the actual root cause either way).
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  const existingOperator = await prisma.user.findUnique({ where: { email: OPERATOR_EMAIL } });

  if (existingOperator) {
    console.log(`Operator user already exists: ${OPERATOR_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(OPERATOR_PASSWORD);
    await prisma.user.create({
      data: {
        email: OPERATOR_EMAIL,
        firstName: OPERATOR_FIRST_NAME,
        lastName: OPERATOR_LAST_NAME,
        passwordHash,
        roleId: operatorRole.id,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Created operator user: ${OPERATOR_EMAIL}`);
  }

  console.log(`Roles ready: ${userRole.name}, ${adminRole.name}, ${operatorRole.name}`);

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
  await seedLookup("Cancellation reasons", prisma.cancellationReason, CANCELLATION_REASONS);
  await seedLookup("Positions", prisma.position, POSITIONS);

  // Not seedLookup — OrderStatus has its own dedicated module now (see
  // order-statuses.*) with an admin-controlled sortOrder, so this seeds
  // (and re-syncs, on every run, unlike seedLookup's update:{} no-op) the
  // lifecycle order below rather than leaving it at the column default.
  for (const [index, entry] of ORDER_STATUSES.entries()) {
    await prisma.orderStatus.upsert({
      where: { key: entry.key },
      update: { sortOrder: index },
      create: { ...entry, sortOrder: index },
    });
  }
  console.log(`Order statuses ready: ${ORDER_STATUSES.map((entry) => entry.key).join(", ")}`);

  await seedLookup("Colors", prisma.color, COLORS);
  await seedLookup("Sizes", prisma.size, SIZES);
  await seedLookup("Cities", prisma.city, CITIES);
  await prisma.city.update({ where: { key: "TBILISI" }, data: { isTbilisi: true } });

  const unitIdByNameKa = await seedUnits();

  const categoryIdBySlug = await seedCategoryTree(PRODUCT_CATEGORY_TREE, null);
  await seedSizeScales(categoryIdBySlug);
  console.log(`Category tree ready: ${categoryIdBySlug.size} categories`);

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

  // Same reasoning as homepage sections above — bootstraps the singleton
  // CompanyInfo/TermsAndConditions rows and the fixed EmailTemplate set
  // deterministically here, instead of leaving them to whichever request
  // happens to read them first.
  await getCompanyInfo();
  console.log("Company info ready");

  await getTerms();
  console.log("Terms and conditions ready");

  const emailTemplates = await listEmailTemplates();
  console.log(`Email templates ready: ${emailTemplates.map((template) => template.key).join(", ")}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
