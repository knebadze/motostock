import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

// Demo buy-together tags over the demo catalog (prisma/seed-products.ts) —
// shows the tag-based "ერთად შეძენა" fill. Run AFTER seed-products.ts:
// `npx tsx prisma/seed-tags.ts`. Safe to re-run: tags are matched by name
// (case-insensitive), links are created with skipDuplicates, and nothing is
// ever removed — an admin's own tags/assignments are left alone. Products
// that don't exist (e.g. a catalog without the demo products) are skipped
// with a warning.
//
// Tag design (see the admin "ტეგები" page hint): one tag = one KIT of
// complementary products from different categories ("oil + its filter",
// "this helmet model + its visor") — never several alternatives of the same
// kind, or they'd be suggested as each other's companions.
type TagSeed = { name: string; description: string; isActive?: boolean; productSlugs: string[] };

const HELMET_VISOR_TAGS: TagSeed[] = (
  [
    ["Shoei", "shoei"],
    ["AGV", "agv"],
    ["Arai", "arai"],
  ] as const
).flatMap(([brand, key]) => [
  {
    name: `${brand} დახურული ჩაფხუტის ვიზორი`,
    description: `${brand}-ის დახურული ჩაფხუტი და მისი სათადარიგო ვიზორი`,
    productSlugs: [`full-face-helmet-${key}`, `helmet-visor-${key}`],
  },
  {
    name: `${brand} მოდულარის ვიზორი`,
    description: `${brand}-ის მოდულარი და მისი სათადარიგო ვიზორი`,
    productSlugs: [`modular-helmet-${key}`, `helmet-visor-${key}`],
  },
]);

const TAGS: TagSeed[] = [
  {
    name: "პერიოდული მომსახურება",
    description: "ზეთის შეცვლა და რეგულარული სერვისი: ზეთი, ფილტრები, საპოხი, გამაგრილებელი",
    productSlugs: ["engine-oil-motul", "oil-filter", "air-filter", "chain-lube-motul", "coolant-castrol"],
  },
  {
    name: "ზეთის შეცვლა",
    description: "ძრავის ზეთი + ზეთის ფილტრი",
    productSlugs: ["engine-oil-motul", "oil-filter"],
  },
  {
    name: "სამუხრუჭე სისტემის განახლება",
    description: "ხუნდები, დისკები და სამუხრუჭე მილები",
    productSlugs: ["brake-pads-brembo", "brake-discs-brembo", "brake-lines-brembo"],
  },
  ...HELMET_VISOR_TAGS,
  {
    name: "სპორტული ტიუნინგი",
    description: "გამონაბოლქვის განახლება და ჰაერის ფილტრი",
    productSlugs: ["slip-on-exhaust", "exhaust-header", "air-filter"],
  },
  {
    name: "წვიმაში მგზავრობა",
    description: "წყალგამძლე ეკიპირება წვიმიანი ამინდისთვის",
    productSlugs: [
      "rain-suit-revit",
      "rain-jacket-revit",
      "waterproof-overpants",
      "touring-boots-revit",
      "textile-gloves-alpinestars",
      "textile-jacket-revit",
    ],
  },
  {
    name: "ტურისტული მოგზაურობა",
    description: "ბარგი, ნავიგაცია და დამტენი გრძელი გზისთვის",
    productSlugs: [
      "saddlebag-givi",
      "top-case-givi",
      "tank-bag-sw-motech",
      "gps-navigator",
      "usb-charger-kit",
      "action-camera-mount",
      "touring-boots-revit",
      "textile-jacket-revit",
    ],
  },
  {
    name: "ქურდობისგან დაცვა",
    description: "საკეტები და სიგნალიზაცია",
    productSlugs: ["chain-lock-xena", "disc-lock-xena", "alarm-system-xena"],
  },
  {
    name: "მძღოლის სრული დაცვა",
    description: "დამცავები, ქურთუკი, ხელთათმანი და ჩექმები",
    productSlugs: [
      "back-protector-dainese",
      "knee-guards-alpinestars",
      "chest-protector-dainese",
      "motorcycle-jacket-alpinestars",
      "leather-gloves-revit",
      "motorcycle-boots-dainese",
    ],
  },
  {
    name: "საზაფხულო მგზავრობა",
    description: "მსუბუქი, კარგად ნიავდება",
    productSlugs: ["mesh-jacket-alpinestars", "fingerless-gloves-revit", "short-boots-alpinestars", "open-face-helmet-agv"],
  },
  {
    name: "ოფროუდი / ენდურო",
    description: "ენდურო ჩაფხუტები, ოფროუდ საბურავი და მუხლის დამცავი",
    productSlugs: [
      "enduro-helmet-agv",
      "enduro-helmet-shoei",
      "enduro-helmet-arai",
      "offroad-tire-dunlop",
      "knee-guards-alpinestars",
    ],
  },
  {
    // An inactive tag: kept on its products, ignored by the recommendations.
    name: "შემოდგომის აქცია (გამორთული)",
    description: "გამორთული ტეგის მაგალითი — რეკომენდაციებში არ მონაწილეობს",
    isActive: false,
    productSlugs: ["sport-tire-pirelli", "battery-agm-yuasa"],
  },
];

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(products.map((product) => [product.slug, product.id]));

  for (const seed of TAGS) {
    const missing = seed.productSlugs.filter((slug) => !idBySlug.has(slug));
    if (missing.length > 0) console.warn(`[${seed.name}] skipped missing products: ${missing.join(", ")}`);
    const productIds = seed.productSlugs
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is number => id != null);
    if (productIds.length === 0) continue;

    const tag =
      (await prisma.tag.findFirst({ where: { name: { equals: seed.name, mode: "insensitive" } } })) ??
      (await prisma.tag.create({
        data: { name: seed.name, description: seed.description, isActive: seed.isActive ?? true },
      }));
    const { count } = await prisma.productTag.createMany({
      data: productIds.map((productId) => ({ productId, tagId: tag.id })),
      skipDuplicates: true,
    });
    console.log(`Tag ready: ${seed.name} (${productIds.length} products, ${count} new links)`);
  }

  console.log(`Done. ${TAGS.length} tag(s) defined.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
