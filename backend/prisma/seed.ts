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
      { slug: "luggage", nameKa: "ჩანთა და საბარგული", nameEn: "Bags & Luggage", nameRu: "Сумки и багаж" },
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
  name: string;
  slug: string;
};

// Brands are attached at whichever category level actually matches how the
// brand sells — a few (Alpinestars, Givi) make gear/accessories broadly and
// are attached at the parent so every subcategory inherits them, while
// single-purpose brands (AGV for helmets, Motul for fluids) are attached
// directly to their leaf category.
const PRODUCT_BRAND_SEEDS: ProductBrandSeed[] = [
  { categorySlug: "gear", name: "Alpinestars", slug: "alpinestars" },
  { categorySlug: "gear", name: "Dainese", slug: "dainese" },
  { categorySlug: "gear", name: "REV'IT!", slug: "revit" },
  { categorySlug: "helmets", name: "AGV", slug: "agv" },
  { categorySlug: "helmets", name: "Shoei", slug: "shoei" },
  { categorySlug: "helmets", name: "Arai", slug: "arai" },
  { categorySlug: "luggage", name: "Givi", slug: "givi" },
  { categorySlug: "luggage", name: "SW-Motech", slug: "sw-motech" },
  { categorySlug: "security", name: "Xena", slug: "xena" },
  { categorySlug: "tires", name: "Michelin", slug: "michelin" },
  { categorySlug: "tires", name: "Pirelli", slug: "pirelli" },
  { categorySlug: "tires", name: "Dunlop", slug: "dunlop" },
  { categorySlug: "fluids", name: "Motul", slug: "motul" },
  { categorySlug: "fluids", name: "Castrol", slug: "castrol" },
  { categorySlug: "brakes", name: "Brembo", slug: "brembo" },
  { categorySlug: "batteries", name: "Yuasa", slug: "yuasa" },
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
        name: brandSeed.name,
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
