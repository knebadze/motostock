import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/lib/roles.js";
import { USE_CLOUD_STORAGE_KEY } from "../src/modules/settings/settings.service.js";

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
