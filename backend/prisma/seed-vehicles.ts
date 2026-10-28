import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

// Demo vehicles for sale: VehicleListing rows attached to existing vehicle
// catalog entries (found by brand + model name), so run
// prisma/seed-brands.ts and prisma/seed-catalog.ts first — this seed creates
// no brands, models or catalog entries of its own. Every description is real
// multi-paragraph/bold/list HTML to exercise the rich text editor. Separate
// from prisma/seed.ts and prisma/seed-products.ts since this is demo/sample
// content, not baseline reference data. Run via
// `npx tsx prisma/seed-vehicles.ts` — safe to re-run (skips existing rows).

async function lookupId(
  delegate: { findUnique: (args: { where: { key: string } }) => Promise<{ id: number } | null> },
  key: string,
): Promise<number> {
  const row = await delegate.findUnique({ where: { key } });
  if (!row) throw new Error(`Unknown lookup key: ${key}`);
  return row.id;
}

type VehicleSeed = {
  brandName: string;
  modelName: string;
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
    brandName: "Kawasaki",
    modelName: "Z900",
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
    brandName: "Yamaha",
    modelName: "YZF-R6",
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
    brandName: "Kawasaki",
    modelName: "Ninja ZX-6R",
    listing: {
      year: 2021,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "GREEN",
      price: 12800,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Kawasaki Ninja ZX-6R</strong> — შუაკლასის სუპერსპორტი, ცნობილი ტრეკზე გამორჩეული მოხერხებულობით.</p><ul><li>მაღალბრუნიანი 636cc ძრავი</li><li>სპორტული სავარძლის პოზიცია</li></ul>",
      descriptionEn:
        "<p><strong>Kawasaki Ninja ZX-6R</strong> — a middleweight supersport known for its razor-sharp handling on track.</p><ul><li>High-revving 636cc engine</li><li>Aggressive sport riding position</li></ul>",
      descriptionRu:
        "<p><strong>Kawasaki Ninja ZX-6R</strong> — среднекубатурный суперспорт, известный острой управляемостью на треке.</p><ul><li>Высокооборотистый двигатель 636cc</li><li>Спортивная посадка</li></ul>",
    },
  },
  {
    brandName: "Suzuki",
    modelName: "GSX-R750",
    listing: {
      year: 2020,
      conditionKey: "USED",
      statusKey: "AVAILABLE",
      colorKey: "BLUE",
      price: 10900,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Suzuki GSX-R750</strong> — უნიკალური 750cc ძრავი, რომელიც შუალედშია 600-სა და 1000-ს შორის სიმძლავრით.</p><ul><li>დამტკიცებული სარბოლო ისტორია</li><li>მსუბუქი და მოქნილი შასი</li></ul>",
      descriptionEn:
        "<p><strong>Suzuki GSX-R750</strong> — a unique 750cc engine that splits the difference between 600 and 1000cc power.</p><ul><li>Proven racing pedigree</li><li>Light, nimble chassis</li></ul>",
      descriptionRu:
        "<p><strong>Suzuki GSX-R750</strong> — уникальный двигатель 750cc, промежуточный между 600 и 1000cc по мощности.</p><ul><li>Проверенная гоночная родословная</li><li>Лёгкое, манёвренное шасси</li></ul>",
    },
  },
  {
    brandName: "Honda",
    modelName: "CBR600RR",
    listing: {
      year: 2022,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "RED",
      price: 13500,
      stockQuantity: 2,
      descriptionKa:
        "<p><strong>Honda CBR600RR</strong> — MotoGP-სგან შთაგონებული აეროდინამიკა და ცნობილი საიმედოობა.</p><ul><li>ელექტრონული სავარძლის მოწესრიგება</li><li>თანმხლები ტრეკ-რეჟიმები</li></ul>",
      descriptionEn:
        "<p><strong>Honda CBR600RR</strong> — MotoGP-inspired aerodynamics paired with Honda's legendary reliability.</p><ul><li>Electronic riding modes</li><li>Dedicated track settings</li></ul>",
      descriptionRu:
        "<p><strong>Honda CBR600RR</strong> — аэродинамика, вдохновлённая MotoGP, и легендарная надёжность Honda.</p><ul><li>Электронные режимы езды</li><li>Отдельные трековые настройки</li></ul>",
    },
  },
  {
    brandName: "Ducati",
    modelName: "Panigale V2",
    listing: {
      year: 2023,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "RED",
      price: 18900,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>Ducati Panigale V2</strong> — იტალიური სუპერბაიკი V-ტვინის ძრავითა და სუფთა, სარბოლო ესთეტიკით.</p><ul><li>V-ტვინის კომპაქტური 955cc ძრავი</li><li>Öhlins დამუხრუჭების საკიდი (ზოგიერთ კომპლექტაციაზე)</li></ul>",
      descriptionEn:
        "<p><strong>Ducati Panigale V2</strong> — an Italian superbike with a V-twin engine and pure, race-bred styling.</p><ul><li>Compact 955cc V-twin engine</li><li>Öhlins suspension on select trims</li></ul>",
      descriptionRu:
        "<p><strong>Ducati Panigale V2</strong> — итальянский супербайк с V-образным двигателем и чистым гоночным стилем.</p><ul><li>Компактный V-образный двигатель 955cc</li><li>Подвеска Öhlins в некоторых комплектациях</li></ul>",
    },
  },
  {
    brandName: "BMW",
    modelName: "S 1000 RR",
    listing: {
      year: 2024,
      conditionKey: "NEW",
      statusKey: "AVAILABLE",
      colorKey: "WHITE",
      price: 21500,
      stockQuantity: 1,
      descriptionKa:
        "<p><strong>BMW S 1000 RR</strong> — ლიტრიანი სუპერბაიკი 210 ცხ.ძ სიმძლავრით და სრული ელექტრონული პაკეტით.</p><ul><li>M-სპორტული პაკეტი</li><li>DTC ტრექშენ-კონტროლი</li></ul>",
      descriptionEn:
        "<p><strong>BMW S 1000 RR</strong> — a literbike superbike with 210 hp and a full electronics package.</p><ul><li>M Sport package</li><li>DTC traction control</li></ul>",
      descriptionRu:
        "<p><strong>BMW S 1000 RR</strong> — литровый супербайк мощностью 210 л.с. с полным пакетом электроники.</p><ul><li>Пакет M Sport</li><li>Трекшн-контроль DTC</li></ul>",
    },
  },
  {
    brandName: "Harley-Davidson",
    modelName: "Sportster Iron 883",
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
    brandName: "Honda",
    modelName: "Gold Wing Audio Comfort",
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
    brandName: "BMW",
    modelName: "R 1250 GS",
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
    brandName: "Suzuki",
    modelName: "DR 650",
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
    brandName: "KTM",
    modelName: "300 EXC",
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
    brandName: "Triumph",
    modelName: "Bonneville Bobber",
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
    brandName: "Kawasaki",
    modelName: "Ninja 1000SX",
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
    brandName: "Can-Am",
    modelName: "Outlander 650 EFI XT",
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
    brandName: "Honda",
    modelName: "PCX150",
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
];

async function seedVehicle(seed: VehicleSeed) {
  const label = `${seed.brandName} ${seed.modelName}`;
  // The model's catalog entry whose years cover the listing's year, else its
  // first one.
  const entries = await prisma.vehicleCatalog.findMany({
    where: { brand: { name: seed.brandName }, model: { name: seed.modelName } },
    orderBy: { id: "asc" },
  });
  if (entries.length === 0) throw new Error(`No catalog entry for ${label} (run prisma/seed-catalog.ts first)`);
  const year = seed.listing.year;
  const vehicleCatalog =
    entries.find((entry) => (entry.yearFrom ?? year) <= year && year <= (entry.yearTo ?? year)) ?? entries[0];

  const existingListing = await prisma.vehicleListing.findFirst({
    where: { vehicleCatalogId: vehicleCatalog.id },
  });
  if (existingListing) {
    console.log(`Listing already exists for ${label}, skipping`);
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
  console.log(`Created listing: ${label}`);
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
