import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  category: { select: namedRefSelect },
  productBrand: { select: namedRefSelect },
  attributeValues: {
    include: {
      attribute: { select: { id: true, nameKa: true, nameEn: true, nameRu: true, valueType: true } },
      option: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
    },
  },
  variants: {
    select: {
      price: true,
      stockQuantity: true,
      discounts: { select: { discountPrice: true, startDate: true, endDate: true } },
    },
  },
} as const;

const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;

// Richer than `include` above — full per-variant images/discounts/size/color
// are only needed for a single product's detail page, not for every product
// row in a category listing, so this stays a separate query shape.
const detailInclude = {
  category: { select: namedRefSelect },
  productBrand: { select: namedRefSelect },
  attributeValues: {
    include: {
      attribute: { select: { id: true, nameKa: true, nameEn: true, nameRu: true, valueType: true } },
      option: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
    },
  },
  variants: {
    include: {
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      condition: { select: lookupSelect },
      status: { select: lookupSelect },
      images: { orderBy: { position: "asc" } },
      discounts: { orderBy: { startDate: "desc" } },
    },
  },
  fitments: {
    include: {
      vehicleCatalog: {
        include: {
          brand: { select: namedRefSelect },
          model: { select: namedRefSelect },
        },
      },
    },
  },
} as const;

type ProductWriteData = {
  categoryId: number;
  productBrandId?: number | null;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

type AttributeValueWriteData = {
  attributeId: number;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  optionId: number | null;
};

export const productsRepository = {
  findMany(categoryIds?: number[]) {
    return prisma.product.findMany({
      where: categoryIds && categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : undefined,
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.product.findUnique({ where: { id }, include });
  },

  findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  },

  findDetailBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug }, include: detailInclude });
  },

  create(data: ProductWriteData) {
    return prisma.product.create({ data, include });
  },

  update(id: number, data: Partial<ProductWriteData>) {
    return prisma.product.update({ where: { id }, data, include });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.product.update({ where: { id }, data: { imageUrl }, include });
  },

  delete(id: number) {
    return prisma.product.delete({ where: { id } });
  },

  // Attribute values are always submitted as the full current set for the
  // product, so a create/update is a delete-then-recreate inside one
  // transaction rather than a per-row upsert.
  async replaceAttributeValues(productId: number, values: AttributeValueWriteData[]) {
    await prisma.$transaction([
      prisma.productAttributeValue.deleteMany({ where: { productId } }),
      ...(values.length > 0
        ? [
            prisma.productAttributeValue.createMany({
              data: values.map((value) => ({ productId, ...value })),
            }),
          ]
        : []),
    ]);
  },
};
