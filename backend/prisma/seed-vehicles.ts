import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

// Demo vehicle-for-sale catalog: one Brand + Model + VehicleCatalog +
// VehicleListing per leaf "transport" category (all 11 motorcycle subtypes
// plus ATV/scooter/kick-scooter). Deliberately mixes fully-specified and
// partially-specified vehicles (only required + a couple of optional spec
// fields) to exercise how the admin UI handles missing optional data, and
// every description is real multi-paragraph/bold/list HTML to exercise the
// rich text editor. Separate from prisma/seed.ts and prisma/seed-products.ts
// since this is demo/sample content, not baseline reference data. Run via
// `npx tsx prisma/seed-vehicles.ts` — safe to re-run (skips existing rows).

async function categoryId(slug: string): Promise<number> {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) throw new Error(`Unknown category slug: ${slug}`);
  return category.id;
}

async function lookupId(
  delegate: { findUnique: (args: { where: { key: string } }) => Promise<{ id: number } | null> },
  key: string,
): Promise<number> {
  const row = await delegate.findUnique({ where: { key } });
  if (!row) throw new Error(`Unknown lookup key: ${key}`);
  return row.id;
}

type BrandSeed = { slug: string; nameKa: string; nameEn: string; nameRu: string };

async function getOrCreateBrand(seed: BrandSeed) {
  return prisma.brand.upsert({
    where: { slug: seed.slug },
    update: {},
    create: seed,
  });
}

type FullSpec = {
  engineVolumeCc?: number;
  enginePowerHp?: number;
  cylinderCount?: number;
  gearCount?: number;
  seatCount?: number;
  weightKg?: number;
  seatHeightMm?: number;
  fuelTankLiters?: number;
  topSpeedKmh?: number;
  hasAbs?: boolean;
  fuelTypeKey?: string;
  transmissionTypeKey?: string;
  coolingTypeKey?: string;
  finalDriveTypeKey?: string;
  driveTypeKey?: string;
  startTypeKey?: string;
  powertrainTypeKey?: string;
  motorPowerWatt?: number;
  batteryCapacityWh?: number;
  rangeKm?: number;
  chargingTimeMinutes?: number;
};

type VehicleSeed = {
  categorySlug: string;
  brand: BrandSeed;
  modelSlug: string;
  modelNameKa: string;
  modelNameEn: string;
  modelNameRu: string;
  yearFrom: number;
  yearTo: number;
  spec: FullSpec;
  listing: {
    year: number;
    conditionKey: string;
    statusKey: string;
    colorKey: string;
    price: number;
    stockQuantity: number;
    descriptionKa: string;
    descriptionEn: string;
    descriptionRu: string;
  };
};

const VEHICLES: VehicleSeed[] = [
  {
    categorySlug: "moto-naked",
    brand: { slug: "kawasaki", nameKa: "კავასაკი", nameEn: "Kawasaki", nameRu: "Кавасаки" },
    modelSlug: "z900",
    modelNameKa: "Z900",
    modelNameEn: "Z900",
    modelNameRu: "Z900",
    yearFrom: 2020,
    yearTo: 2025,
    spec: {
      engineVolumeCc: 948,
      enginePowerHp: 125,
      cylinderCount: 4,
      gearCount: 6,
      seatCount: 2,
      weightKg: 212,
      seatHeightMm: 795,
      fuelTankLiters: 17,
      topSpeedKmh: 235,
      hasAbs: true,
      fuelTypeKey: "PETROL",
      transmissionTypeKey: "MANUAL",
      coolingTypeKey: "LIQUID",
      finalDriveTypeKey: "CHAIN",
      driveTypeKey: "TWO_WD",
      startTypeKey: "ELECTRIC",
      powertrainTypeKey: "COMBUSTION",
    },
    listing: {
      year: 2023,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "GREEN",
      price: 11500,
      stockQuantity: 2,
      descriptionKa:
        "<p><strong>Kawasaki Z900</strong> — ქუჩის ტიპის მოტოციკლი, რომელიც აერთიანებს <em>აგრესიულ დიზაინს</em> და მაღალ წარმადობას.</p><ul><li>4-ცილინდრიანი, სითხური გაგრილება</li><li>ABS ორივე ბორბალზე</li><li>მსუბუქი ჩარჩო — მარტივი მართვა ქალაქშიც</li></ul>",
      descriptionEn:
        "<p><strong>Kawasaki Z900</strong> — a naked streetfighter combining <em>aggressive styling</em> with strong performance.</p><ul><li>Inline-4, liquid-cooled</li><li>ABS on both wheels</li><li>Lightweight frame — easy to handle even in the city</li></ul>",
      descriptionRu:
        "<p><strong>Kawasaki Z900</strong> — найкед-мотоцикл, сочетающий <em>агрессивный дизайн</em> и высокую производительность.</p><ul><li>Рядная четвёрка, жидкостное охлаждение</li><li>ABS на обоих колёсах</li><li>Лёгкая рама — прост в управлении даже в городе</li></ul>",
    },
  },
  {
    categorySlug: "moto-sportbike",
    brand: { slug: "yamaha", nameKa: "იამაჰა", nameEn: "Yamaha", nameRu: "Ямаха" },
    modelSlug: "yzf-r6",
    modelNameKa: "YZF-R6",
    modelNameEn: "YZF-R6",
    modelNameRu: "YZF-R6",
    yearFrom: 2017,
    yearTo: 2020,
    spec: {
      engineVolumeCc: 599,
      enginePowerHp: 118,
      cylinderCount: 4,
      gearCount: 6,
      seatCount: 2,
      weightKg: 190,
      seatHeightMm: 850,
      fuelTankLiters: 17,
      topSpeedKmh: 260,
      hasAbs: true,
      fuelTypeKey: "PETROL",
      transmissionTypeKey: "MANUAL",
      coolingTypeKey: "LIQUID",
      finalDriveTypeKey: "CHAIN",
      driveTypeKey: "TWO_WD",
      startTypeKey: "ELECTRIC",
      powertrainTypeKey: "COMBUSTION",
    },
    listing: {
      year: 2019,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "BLUE",
      price: 13200,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Yamaha YZF-R6</strong> — სუფთა სპორტული მოტოციკლი, რომელიც შექმნილია <em>ტრეკზე</em> დომინირებისთვის.</p><ul><li>მაღალბრუნიანი 600cc ძრავი</li><li>რბოლური ელექტრონიკის პაკეტი</li></ul>",
      descriptionEn:
        "<p><strong>Yamaha YZF-R6</strong> — a pure sportbike built to dominate on the <em>track</em>.</p><ul><li>High-revving 600cc engine</li><li>Race-derived electronics package</li></ul>",
      descriptionRu:
        "<p><strong>Yamaha YZF-R6</strong> — чистый спортбайк, созданный для доминирования на <em>треке</em>.</p><ul><li>Высокооборотистый двигатель 600cc</li><li>Гоночный пакет электроники</li></ul>",
    },
  },
  {
    categorySlug: "moto-cruiser",
    brand: { slug: "harley-davidson", nameKa: "ჰარლი-დევიდსონი", nameEn: "Harley-Davidson", nameRu: "Харли-Дэвидсон" },
    modelSlug: "iron-883",
    modelNameKa: "Iron 883",
    modelNameEn: "Iron 883",
    modelNameRu: "Iron 883",
    yearFrom: 2015,
    yearTo: 2022,
    spec: {
      engineVolumeCc: 883,
      cylinderCount: 2,
      fuelTypeKey: "PETROL",
    },
    listing: {
      year: 2018,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "BLACK",
      price: 8900,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Harley-Davidson Iron 883</strong> — კლასიკური კრუიზერი, ავთენტური ამერიკული ხასიათით.</p><p>იდეალურია მათთვის, ვისაც მოსწონს <em>დაბალი, კუნთიანი</em> სილუეტი და V-Twin-ის ხმა.</p>",
      descriptionEn:
        "<p><strong>Harley-Davidson Iron 883</strong> — a classic cruiser with authentic American character.</p><p>Perfect for riders who love a <em>low, muscular</em> silhouette and the sound of a V-Twin.</p>",
      descriptionRu:
        "<p><strong>Harley-Davidson Iron 883</strong> — классический круизер с настоящим американским характером.</p><p>Идеален для тех, кто любит <em>низкий, мускулистый</em> силуэт и звук V-Twin.</p>",
    },
  },
  {
    categorySlug: "moto-touring",
    brand: { slug: "honda", nameKa: "ჰონდა", nameEn: "Honda", nameRu: "Хонда" },
    modelSlug: "gold-wing",
    modelNameKa: "Gold Wing",
    modelNameEn: "Gold Wing",
    modelNameRu: "Gold Wing",
    yearFrom: 2018,
    yearTo: 2024,
    spec: { engineVolumeCc: 1833, fuelTypeKey: "PETROL" },
    listing: {
      year: 2021,
      conditionKey: "NEW",
      statusKey: "RESERVED",
      colorKey: "SILVER",
      price: 28500,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Honda Gold Wing</strong> — გრძელი მანძილის ტურისტული მოტოციკლი მაქსიმალური კომფორტით.</p><ul><li>დიდი საბარგო სივრცე</li><li>სრული ვეტრობმური დაცვა</li></ul>",
      descriptionEn:
        "<p><strong>Honda Gold Wing</strong> — a long-distance touring motorcycle with maximum comfort.</p><ul><li>Large luggage capacity</li><li>Full wind protection</li></ul>",
      descriptionRu:
        "<p><strong>Honda Gold Wing</strong> — туристический мотоцикл для дальних поездок с максимальным комфортом.</p><ul><li>Большой багажный объём</li><li>Полная ветрозащита</li></ul>",
    },
  },
  {
    categorySlug: "moto-adventure",
    brand: { slug: "bmw", nameKa: "ბმვ", nameEn: "BMW", nameRu: "БМВ" },
    modelSlug: "r-1250-gs",
    modelNameKa: "R 1250 GS",
    modelNameEn: "R 1250 GS",
    modelNameRu: "R 1250 GS",
    yearFrom: 2019,
    yearTo: 2025,
    spec: {
      engineVolumeCc: 1254,
      enginePowerHp: 136,
      cylinderCount: 2,
      gearCount: 6,
      seatCount: 2,
      weightKg: 249,
      seatHeightMm: 850,
      fuelTankLiters: 20,
      topSpeedKmh: 220,
      hasAbs: true,
      fuelTypeKey: "PETROL",
      transmissionTypeKey: "MANUAL",
      coolingTypeKey: "LIQUID",
      finalDriveTypeKey: "SHAFT",
      driveTypeKey: "TWO_WD",
      startTypeKey: "ELECTRIC",
      powertrainTypeKey: "COMBUSTION",
    },
    listing: {
      year: 2022,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "WHITE",
      price: 21500,
      stockQuantity: 2,
      descriptionKa:
        "<p><strong>BMW R 1250 GS</strong> — სათავგადასავლო მოტოციკლების ეტალონი, ერთნაირად კარგი გზაზეც და გზის გარეშეც.</p><ul><li>Shaft-drive საბოლოო გადაცემა</li><li>ელექტრონული სავარძლის რეგულირება</li></ul>",
      descriptionEn:
        "<p><strong>BMW R 1250 GS</strong> — the benchmark adventure bike, equally at home on-road and off.</p><ul><li>Shaft final drive</li><li>Electronic suspension adjustment</li></ul>",
      descriptionRu:
        "<p><strong>BMW R 1250 GS</strong> — эталон эндуро-турера, одинаково хорош на дороге и вне её.</p><ul><li>Карданный привод</li><li>Электронная регулировка подвески</li></ul>",
    },
  },
  {
    categorySlug: "moto-dual-sport",
    brand: { slug: "suzuki", nameKa: "სუზუკი", nameEn: "Suzuki", nameRu: "Сузуки" },
    modelSlug: "dr650",
    modelNameKa: "DR650",
    modelNameEn: "DR650",
    modelNameRu: "DR650",
    yearFrom: 2016,
    yearTo: 2023,
    spec: { engineVolumeCc: 644, fuelTypeKey: "PETROL" },
    listing: {
      year: 2020,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "YELLOW",
      price: 5900,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Suzuki DR650</strong> — მარტივი და საიმედო დუალური დანიშნულების მოტოციკლი.</p><p>თანაბრად კარგია <em>ასფალტზეც და გრუნტზეც</em>.</p>",
      descriptionEn:
        "<p><strong>Suzuki DR650</strong> — a simple, reliable dual-sport motorcycle.</p><p>Equally capable <em>on pavement and dirt</em>.</p>",
      descriptionRu:
        "<p><strong>Suzuki DR650</strong> — простой и надёжный дуал-спорт мотоцикл.</p><p>Одинаково хорош <em>на асфальте и на грунте</em>.</p>",
    },
  },
  {
    categorySlug: "moto-enduro",
    brand: { slug: "ktm", nameKa: "კტმ", nameEn: "KTM", nameRu: "КТМ" },
    modelSlug: "300-exc",
    modelNameKa: "300 EXC",
    modelNameEn: "300 EXC",
    modelNameRu: "300 EXC",
    yearFrom: 2021,
    yearTo: 2025,
    spec: {
      engineVolumeCc: 293,
      enginePowerHp: 55,
      cylinderCount: 1,
      gearCount: 6,
      seatCount: 1,
      weightKg: 104,
      seatHeightMm: 955,
      fuelTankLiters: 9,
      topSpeedKmh: 130,
      hasAbs: false,
      fuelTypeKey: "PETROL",
      transmissionTypeKey: "MANUAL",
      coolingTypeKey: "LIQUID",
      finalDriveTypeKey: "CHAIN",
      driveTypeKey: "TWO_WD",
      startTypeKey: "KICK",
      powertrainTypeKey: "COMBUSTION",
    },
    listing: {
      year: 2023,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "ORANGE",
      price: 9800,
      stockQuantity: 3,
      descriptionKa:
        "<p><strong>KTM 300 EXC</strong> — მსუბუქი 2-tактიანი ენდურო, აშენებული გაუვალი ტერიტორიისთვის.</p><ul><li>ულტრა-მსუბუქი წონა</li><li>მაღალი კომპრესია, ძლიერი მოტორი დაბალ ბრუნებზეც</li></ul>",
      descriptionEn:
        "<p><strong>KTM 300 EXC</strong> — a lightweight 2-stroke enduro built for extreme off-road terrain.</p><ul><li>Ultra-light weight</li><li>Strong low-end power delivery</li></ul>",
      descriptionRu:
        "<p><strong>KTM 300 EXC</strong> — лёгкий 2-тактный эндуро для экстремального бездорожья.</p><ul><li>Сверхлёгкий вес</li><li>Мощная тяга на низких оборотах</li></ul>",
    },
  },
  {
    categorySlug: "moto-supermoto",
    brand: { slug: "ktm", nameKa: "კტმ", nameEn: "KTM", nameRu: "КТМ" },
    modelSlug: "690-smc-r",
    modelNameKa: "690 SMC R",
    modelNameEn: "690 SMC R",
    modelNameRu: "690 SMC R",
    yearFrom: 2019,
    yearTo: 2024,
    spec: { engineVolumeCc: 693, fuelTypeKey: "PETROL" },
    listing: {
      year: 2022,
      conditionKey: "NEW",
      statusKey: "SOLD",
      colorKey: "ORANGE",
      price: 11200,
      stockQuantity: 0,
      descriptionKa:
        "<p><strong>KTM 690 SMC R</strong> — ერთცილინდრიანი სუპერმოტო, მკვეთრი მართვადობითა და დიდი სიმძლავრით.</p>",
      descriptionEn: "<p><strong>KTM 690 SMC R</strong> — a single-cylinder supermoto with razor-sharp handling and strong power.</p>",
      descriptionRu: "<p><strong>KTM 690 SMC R</strong> — одноцилиндровый супермото с острой управляемостью и хорошей мощностью.</p>",
    },
  },
  {
    categorySlug: "moto-cafe-racer",
    brand: { slug: "triumph", nameKa: "ტრაიუმფი", nameEn: "Triumph", nameRu: "Триумф" },
    modelSlug: "street-twin",
    modelNameKa: "Street Twin",
    modelNameEn: "Street Twin",
    modelNameRu: "Street Twin",
    yearFrom: 2017,
    yearTo: 2023,
    spec: { engineVolumeCc: 900, fuelTypeKey: "PETROL" },
    listing: {
      year: 2020,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "BLACK",
      price: 9500,
      stockQuantity: 2,
      descriptionKa:
        "<p><strong>Triumph Street Twin</strong> — ნეო-რეტრო სტილი, თანამედროვე საიმედოობით.</p><p>კლასიკური silhouette, <em>თანამედროვე</em> ელექტრონიკის პაკეტით.</p>",
      descriptionEn:
        "<p><strong>Triumph Street Twin</strong> — neo-retro styling with modern reliability.</p><p>A classic silhouette with a <em>modern</em> electronics package.</p>",
      descriptionRu:
        "<p><strong>Triumph Street Twin</strong> — нео-ретро стиль с современной надёжностью.</p><p>Классический силуэт с <em>современным</em> пакетом электроники.</p>",
    },
  },
  {
    categorySlug: "moto-bobber",
    brand: { slug: "triumph", nameKa: "ტრაიუმფი", nameEn: "Triumph", nameRu: "Триумф" },
    modelSlug: "bonneville-bobber",
    modelNameKa: "Bonneville Bobber",
    modelNameEn: "Bonneville Bobber",
    modelNameRu: "Bonneville Bobber",
    yearFrom: 2017,
    yearTo: 2023,
    spec: { engineVolumeCc: 1200, fuelTypeKey: "PETROL" },
    listing: {
      year: 2021,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "BLACK",
      price: 10800,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Triumph Bonneville Bobber</strong> — მინიმალისტური, ჩამოჭრილი ხაზები კლასიკურ ჩოპერულ ესთეტიკაში.</p>",
      descriptionEn: "<p><strong>Triumph Bonneville Bobber</strong> — minimalist, chopped lines with classic bobber aesthetics.</p>",
      descriptionRu: "<p><strong>Triumph Bonneville Bobber</strong> — минималистичные, обрезанные линии в классической эстетике боббера.</p>",
    },
  },
  {
    categorySlug: "moto-sport-touring",
    brand: { slug: "kawasaki", nameKa: "კავასაკი", nameEn: "Kawasaki", nameRu: "Кавасаки" },
    modelSlug: "ninja-1000sx",
    modelNameKa: "Ninja 1000SX",
    modelNameEn: "Ninja 1000SX",
    modelNameRu: "Ninja 1000SX",
    yearFrom: 2020,
    yearTo: 2025,
    spec: { engineVolumeCc: 1043, fuelTypeKey: "PETROL" },
    listing: {
      year: 2023,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "GRAY",
      price: 15900,
      stockQuantity: 2,
      descriptionKa:
        "<p><strong>Kawasaki Ninja 1000SX</strong> — სპორტული წარმადობა შორ მანძილზე კომფორტთან ერთად.</p>",
      descriptionEn: "<p><strong>Kawasaki Ninja 1000SX</strong> — sportbike performance combined with long-distance comfort.</p>",
      descriptionRu: "<p><strong>Kawasaki Ninja 1000SX</strong> — спортивная динамика в сочетании с комфортом для дальних поездок.</p>",
    },
  },
  {
    categorySlug: "atvs",
    brand: { slug: "can-am", nameKa: "კან-ამ", nameEn: "Can-Am", nameRu: "Can-Am" },
    modelSlug: "outlander",
    modelNameKa: "Outlander",
    modelNameEn: "Outlander",
    modelNameRu: "Outlander",
    yearFrom: 2019,
    yearTo: 2024,
    spec: { engineVolumeCc: 570, fuelTypeKey: "PETROL" },
    listing: {
      year: 2021,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "GREEN",
      price: 7200,
      stockQuantity: 1,
      descriptionKa: "<p><strong>Can-Am Outlander</strong> — სამუშაო კვადროციკლი 4x4 სისტემით, გაუვალი ტერიტორიისთვის.</p>",
      descriptionEn: "<p><strong>Can-Am Outlander</strong> — a 4x4 utility ATV built for tough terrain.</p>",
      descriptionRu: "<p><strong>Can-Am Outlander</strong> — утилитарный квадроцикл 4x4 для сложной местности.</p>",
    },
  },
  {
    categorySlug: "scooters",
    brand: { slug: "honda", nameKa: "ჰონდა", nameEn: "Honda", nameRu: "Хонда" },
    modelSlug: "pcx150",
    modelNameKa: "PCX150",
    modelNameEn: "PCX150",
    modelNameRu: "PCX150",
    yearFrom: 2018,
    yearTo: 2024,
    spec: { engineVolumeCc: 150, fuelTypeKey: "PETROL" },
    listing: {
      year: 2022,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "WHITE",
      price: 2800,
      stockQuantity: 3,
      descriptionKa: "<p><strong>Honda PCX150</strong> — ეკონომიური საქალაქო სკუტერი ავტომატური გადაცემათა კოლოფით.</p>",
      descriptionEn: "<p><strong>Honda PCX150</strong> — an economical city scooter with automatic transmission.</p>",
      descriptionRu: "<p><strong>Honda PCX150</strong> — экономичный городской скутер с автоматической коробкой.</p>",
    },
  },
  {
    categorySlug: "kick-scooters",
    brand: { slug: "xiaomi", nameKa: "სიაომი", nameEn: "Xiaomi", nameRu: "Сяоми" },
    modelSlug: "electric-scooter-4",
    modelNameKa: "Electric Scooter 4",
    modelNameEn: "Electric Scooter 4",
    modelNameRu: "Electric Scooter 4",
    yearFrom: 2022,
    yearTo: 2025,
    spec: {
      weightKg: 18,
      topSpeedKmh: 25,
      hasAbs: false,
      fuelTypeKey: "ELECTRIC",
      transmissionTypeKey: "AUTOMATIC",
      startTypeKey: "ELECTRIC",
      powertrainTypeKey: "ELECTRIC",
      motorPowerWatt: 300,
      batteryCapacityWh: 275,
      rangeKm: 30,
      chargingTimeMinutes: 360,
    },
    listing: {
      year: 2023,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "BLACK",
      price: 650,
      stockQuantity: 6,
      descriptionKa:
        "<p><strong>Xiaomi Electric Scooter 4</strong> — მსუბუქი ელექტრო სქროლი ყოველდღიური საქალაქო გადაადგილებისთვის.</p><ul><li>დამუხტვის დრო: 6 საათი</li><li>მანძილი ერთ დამუხტვაზე: 30 კმ</li></ul>",
      descriptionEn:
        "<p><strong>Xiaomi Electric Scooter 4</strong> — a lightweight electric kick scooter for daily city commuting.</p><ul><li>Charging time: 6 hours</li><li>Range per charge: 30 km</li></ul>",
      descriptionRu:
        "<p><strong>Xiaomi Electric Scooter 4</strong> — лёгкий электросамокат для ежедневных городских поездок.</p><ul><li>Время зарядки: 6 часов</li><li>Запас хода: 30 км</li></ul>",
    },
  },
];

async function seedVehicle(seed: VehicleSeed) {
  const catId = await categoryId(seed.categorySlug);
  const brand = await getOrCreateBrand(seed.brand);

  const model = await prisma.model.upsert({
    where: { brandId_slug: { brandId: brand.id, slug: seed.modelSlug } },
    update: {},
    create: {
      brandId: brand.id,
      categoryId: catId,
      slug: seed.modelSlug,
      nameKa: seed.modelNameKa,
      nameEn: seed.modelNameEn,
      nameRu: seed.modelNameRu,
    },
  });

  const spec = seed.spec;
  const vehicleCatalog = await prisma.vehicleCatalog.upsert({
    where: {
      modelId_variant_yearFrom_yearTo: {
        modelId: model.id,
        variant: "",
        yearFrom: seed.yearFrom,
        yearTo: seed.yearTo,
      },
    },
    update: {},
    create: {
      brandId: brand.id,
      modelId: model.id,
      variant: "",
      yearFrom: seed.yearFrom,
      yearTo: seed.yearTo,
      engineVolumeCc: spec.engineVolumeCc,
      enginePowerHp: spec.enginePowerHp,
      cylinderCount: spec.cylinderCount,
      gearCount: spec.gearCount,
      seatCount: spec.seatCount,
      weightKg: spec.weightKg,
      seatHeightMm: spec.seatHeightMm,
      fuelTankLiters: spec.fuelTankLiters,
      topSpeedKmh: spec.topSpeedKmh,
      hasAbs: spec.hasAbs,
      fuelTypeId: spec.fuelTypeKey ? await lookupId(prisma.fuelType, spec.fuelTypeKey) : null,
      transmissionTypeId: spec.transmissionTypeKey
        ? await lookupId(prisma.transmissionType, spec.transmissionTypeKey)
        : null,
      coolingTypeId: spec.coolingTypeKey ? await lookupId(prisma.coolingType, spec.coolingTypeKey) : null,
      finalDriveTypeId: spec.finalDriveTypeKey
        ? await lookupId(prisma.finalDriveType, spec.finalDriveTypeKey)
        : null,
      driveTypeId: spec.driveTypeKey ? await lookupId(prisma.driveType, spec.driveTypeKey) : null,
      startTypeId: spec.startTypeKey ? await lookupId(prisma.startType, spec.startTypeKey) : null,
      powertrainTypeId: spec.powertrainTypeKey
        ? await lookupId(prisma.powertrainType, spec.powertrainTypeKey)
        : null,
      motorPowerWatt: spec.motorPowerWatt,
      batteryCapacityWh: spec.batteryCapacityWh,
      rangeKm: spec.rangeKm,
      chargingTimeMinutes: spec.chargingTimeMinutes,
    },
  });

  const existingListing = await prisma.vehicleListing.findFirst({
    where: { vehicleCatalogId: vehicleCatalog.id },
  });
  if (existingListing) {
    console.log(`Listing already exists for ${seed.brand.nameEn} ${seed.modelNameEn}, skipping`);
    return;
  }

  const listing = seed.listing;
  await prisma.vehicleListing.create({
    data: {
      vehicleCatalogId: vehicleCatalog.id,
      conditionId: await lookupId(prisma.condition, listing.conditionKey),
      statusId: await lookupId(prisma.listingStatus, listing.statusKey),
      colorId: await lookupId(prisma.color, listing.colorKey),
      year: listing.year,
      price: listing.price,
      stockQuantity: listing.stockQuantity,
      descriptionKa: listing.descriptionKa,
      descriptionEn: listing.descriptionEn,
      descriptionRu: listing.descriptionRu,
    },
  });
  console.log(`Created listing: ${seed.brand.nameEn} ${seed.modelNameEn} (${seed.categorySlug})`);
}

async function main() {
  for (const seed of VEHICLES) {
    await seedVehicle(seed);
  }
  console.log(`Done. ${VEHICLES.length} vehicle listing(s) defined.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
