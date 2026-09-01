import { beforeEach, describe, expect, it, vi } from "vitest";
import { promoCodesRepository } from "./promo-codes.repository.js";
import { productVariantsRepository } from "../product-variants/product-variants.repository.js";
import { productsRepository } from "../products/products.repository.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { resolvePromoCodeForItems, promoCodeItemKey } from "./promo-codes.service.js";

vi.mock("./promo-codes.repository.js", () => ({
  promoCodesRepository: {
    findByCode: vi.fn(),
    hasUserUsed: vi.fn(),
    countUsage: vi.fn(),
  },
}));

vi.mock("../product-variants/product-variants.repository.js", () => ({
  productVariantsRepository: { findById: vi.fn() },
}));

vi.mock("../products/products.repository.js", () => ({
  productsRepository: { findById: vi.fn() },
}));

vi.mock("../vehicle-listing/vehicle-listing.repository.js", () => ({
  vehicleListingRepository: { findById: vi.fn() },
}));

vi.mock("../categories/categories.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../categories/categories.service.js")>();
  return { ...actual, resolveCategoryAndDescendantIds: vi.fn() };
});

const NOW = Date.now();
const YESTERDAY = new Date(NOW - 24 * 60 * 60 * 1000);
const TOMORROW = new Date(NOW + 24 * 60 * 60 * 1000);
const LAST_WEEK = new Date(NOW - 7 * 24 * 60 * 60 * 1000);
const NEXT_WEEK = new Date(NOW + 7 * 24 * 60 * 60 * 1000);

// Loosely typed on purpose — the real repository return type carries
// Prisma's Decimal for discountPercent and much more nested detail than
// resolvePromoCodeForItems actually reads; this fixture only needs the
// fields the function under test touches.
function basePromoCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: "SAVE10",
    domain: "PRODUCT",
    category: null,
    categoryId: null,
    productBrand: null,
    productBrandId: null,
    attribute: null,
    attributeId: null,
    attributeOption: null,
    attributeOptionId: null,
    brand: null,
    brandId: null,
    model: null,
    modelId: null,
    specField: null,
    specLookupItemId: null,
    discountPercent: 10,
    usageLimit: null,
    startDate: YESTERDAY,
    endDate: TOMORROW,
    isActive: true,
    createdAt: YESTERDAY,
    updatedAt: YESTERDAY,
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof promoCodesRepository.findByCode>>;
}

const PRODUCT_ITEM = { itemType: "PRODUCT_VARIANT" as const, productVariantId: 42 };
const VEHICLE_ITEM = { itemType: "VEHICLE_LISTING" as const, vehicleListingId: 99 };

describe("resolvePromoCodeForItems", () => {
  beforeEach(() => {
    vi.mocked(promoCodesRepository.findByCode).mockReset();
    vi.mocked(promoCodesRepository.hasUserUsed).mockReset().mockResolvedValue(false);
    vi.mocked(promoCodesRepository.countUsage).mockReset().mockResolvedValue(0);
    vi.mocked(productVariantsRepository.findById).mockReset();
    vi.mocked(productsRepository.findById).mockReset();
    vi.mocked(vehicleListingRepository.findById).mockReset();
    vi.mocked(resolveCategoryAndDescendantIds).mockReset();
  });

  it("rejects an unknown code", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(null);

    await expect(resolvePromoCodeForItems("NOPE", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი არასწორია ან არააქტიურია",
    });
  });

  it("rejects a disabled code", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ isActive: false }));

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი არასწორია ან არააქტიურია",
    });
  });

  it("rejects a code that hasn't started yet", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ startDate: NEXT_WEEK, endDate: new Date(NOW + 14 * 24 * 60 * 60 * 1000) }),
    );

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდის მოქმედების ვადა ამოწურულია",
    });
  });

  it("rejects an expired code", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ startDate: LAST_WEEK, endDate: YESTERDAY }),
    );

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდის მოქმედების ვადა ამოწურულია",
    });
  });

  it("rejects reuse by a user who already redeemed this code", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode());
    vi.mocked(promoCodesRepository.hasUserUsed).mockResolvedValue(true);

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "თქვენ უკვე გამოიყენეთ ეს პრომო კოდი",
    });
  });

  it("rejects a code that already hit its total usage limit", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ usageLimit: 5 }));
    vi.mocked(promoCodesRepository.countUsage).mockResolvedValue(5);

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდის გამოყენების ლიმიტი ამოწურულია",
    });
  });

  it("allows a code below its usage limit", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ usageLimit: 5 }));
    vi.mocked(promoCodesRepository.countUsage).mockResolvedValue(4);
    vi.mocked(productVariantsRepository.findById).mockResolvedValue({ product: { id: 7 } } as never);
    vi.mocked(productsRepository.findById).mockResolvedValue({
      categoryId: 1,
      productBrandId: null,
      attributeValues: [],
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1);
    expect(result.matchedKeys.has(promoCodeItemKey(PRODUCT_ITEM))).toBe(true);
  });

  it("matches a PRODUCT item within the promo's category scope", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ categoryId: 10 }));
    vi.mocked(resolveCategoryAndDescendantIds).mockResolvedValue([10]);
    vi.mocked(productVariantsRepository.findById).mockResolvedValue({ product: { id: 7 } } as never);
    vi.mocked(productsRepository.findById).mockResolvedValue({
      categoryId: 10,
      productBrandId: null,
      attributeValues: [],
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1);

    expect(result.matchedKeys.has(promoCodeItemKey(PRODUCT_ITEM))).toBe(true);
  });

  it("rejects a PRODUCT item outside the promo's category scope", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ categoryId: 10 }));
    vi.mocked(resolveCategoryAndDescendantIds).mockResolvedValue([10]);
    vi.mocked(productVariantsRepository.findById).mockResolvedValue({ product: { id: 7 } } as never);
    vi.mocked(productsRepository.findById).mockResolvedValue({
      categoryId: 999,
      productBrandId: null,
      attributeValues: [],
    } as never);

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი ამ კალათის არცერთ ნივთს არ ეხება",
    });
  });

  // Regression test for a bug where the category-scope check walked
  // ancestors instead of descendants — a promo scoped to a mid-level
  // category (e.g. "Engine Parts") silently matched nothing, since
  // products/listings only ever live on leaf categories underneath it.
  it("matches a PRODUCT item on a leaf category nested under the promo's mid-level category scope", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(basePromoCode({ categoryId: 10 }));
    vi.mocked(resolveCategoryAndDescendantIds).mockResolvedValue([10, 11, 12]);
    vi.mocked(productVariantsRepository.findById).mockResolvedValue({ product: { id: 7 } } as never);
    vi.mocked(productsRepository.findById).mockResolvedValue({
      categoryId: 11,
      productBrandId: null,
      attributeValues: [],
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1);

    expect(result.matchedKeys.has(promoCodeItemKey(PRODUCT_ITEM))).toBe(true);
  });

  it("matches a VEHICLE item on a leaf category nested under the promo's mid-level category scope", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ domain: "VEHICLE", categoryId: 10 }),
    );
    vi.mocked(resolveCategoryAndDescendantIds).mockResolvedValue([10, 11, 12]);
    vi.mocked(vehicleListingRepository.findById).mockResolvedValue({
      vehicleCatalog: {
        brandId: null,
        modelId: null,
        model: { category: { id: 11 } },
        fuelTypeId: null,
      },
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [VEHICLE_ITEM], 1);

    expect(result.matchedKeys.has(promoCodeItemKey(VEHICLE_ITEM))).toBe(true);
  });

  it("requires a matching attribute option when the promo is scoped to one", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ attributeId: 5, attributeOptionId: 50 }),
    );
    vi.mocked(productVariantsRepository.findById).mockResolvedValue({ product: { id: 7 } } as never);
    vi.mocked(productsRepository.findById).mockResolvedValue({
      categoryId: 1,
      productBrandId: null,
      attributeValues: [{ attributeId: 5, optionId: 999 }],
    } as never);

    await expect(resolvePromoCodeForItems("SAVE10", [PRODUCT_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი ამ კალათის არცერთ ნივთს არ ეხება",
    });
  });

  it("matches a VEHICLE item by brand and model", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ domain: "VEHICLE", brandId: 3, modelId: 30 }),
    );
    vi.mocked(vehicleListingRepository.findById).mockResolvedValue({
      vehicleCatalog: {
        brandId: 3,
        modelId: 30,
        model: { category: { id: 1 } },
        fuelTypeId: null,
      },
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [VEHICLE_ITEM], 1);

    expect(result.matchedKeys.has(promoCodeItemKey(VEHICLE_ITEM))).toBe(true);
  });

  it("rejects a VEHICLE item from a different model when the promo is model-scoped", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ domain: "VEHICLE", brandId: 3, modelId: 30 }),
    );
    vi.mocked(vehicleListingRepository.findById).mockResolvedValue({
      vehicleCatalog: {
        brandId: 3,
        modelId: 999,
        model: { category: { id: 1 } },
        fuelTypeId: null,
      },
    } as never);

    await expect(resolvePromoCodeForItems("SAVE10", [VEHICLE_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი ამ კალათის არცერთ ნივთს არ ეხება",
    });
  });

  it("matches a VEHICLE item on a spec-field lookup value", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ domain: "VEHICLE", specField: "FUEL_TYPE", specLookupItemId: 8 }),
    );
    vi.mocked(vehicleListingRepository.findById).mockResolvedValue({
      vehicleCatalog: {
        brandId: null,
        modelId: null,
        model: { category: { id: 1 } },
        fuelTypeId: 8,
      },
    } as never);

    const result = await resolvePromoCodeForItems("SAVE10", [VEHICLE_ITEM], 1);

    expect(result.matchedKeys.has(promoCodeItemKey(VEHICLE_ITEM))).toBe(true);
  });

  it("rejects a VEHICLE item whose spec-field value doesn't match", async () => {
    vi.mocked(promoCodesRepository.findByCode).mockResolvedValue(
      basePromoCode({ domain: "VEHICLE", specField: "FUEL_TYPE", specLookupItemId: 8 }),
    );
    vi.mocked(vehicleListingRepository.findById).mockResolvedValue({
      vehicleCatalog: {
        brandId: null,
        modelId: null,
        model: { category: { id: 1 } },
        fuelTypeId: 3,
      },
    } as never);

    await expect(resolvePromoCodeForItems("SAVE10", [VEHICLE_ITEM], 1)).rejects.toMatchObject({
      statusCode: 400,
      message: "პრომო კოდი ამ კალათის არცერთ ნივთს არ ეხება",
    });
  });
});
