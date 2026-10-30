import { prisma } from "../../config/prisma.js";

const tagWithCount = {
  _count: { select: { products: true } },
} as const;

type TagWriteData = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export const tagsRepository = {
  findMany() {
    return prisma.tag.findMany({ include: tagWithCount, orderBy: { name: "asc" } });
  },

  findById(id: number) {
    return prisma.tag.findUnique({ where: { id }, include: tagWithCount });
  },

  // Case-insensitive duplicate check — the DB's lower(btrim(name)) unique
  // index is the real guarantee (see the migration); this just gives a
  // clean 409 before hitting it.
  findByNameInsensitive(name: string) {
    return prisma.tag.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  },

  countByIds(ids: number[]) {
    return prisma.tag.count({ where: { id: { in: ids } } });
  },

  create(data: TagWriteData) {
    return prisma.tag.create({ data, include: tagWithCount });
  },

  update(id: number, data: Partial<TagWriteData>) {
    return prisma.tag.update({ where: { id }, data, include: tagWithCount });
  },

  delete(id: number) {
    return prisma.tag.delete({ where: { id } });
  },

  findProducts(tagId: number) {
    return prisma.product.findMany({
      where: { tags: { some: { tagId } } },
      select: {
        id: true,
        nameKa: true,
        nameEn: true,
        nameRu: true,
        slug: true,
        imageUrl: true,
        category: { select: { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } },
      },
      orderBy: { nameKa: "asc" },
    });
  },

  findProductTags(productId: number) {
    return prisma.tag.findMany({
      where: { products: { some: { productId } } },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: "asc" },
    });
  },

  // Buy-together tag companions, ranked: products sharing at least one
  // ACTIVE tag with the anchor, in a DIFFERENT category (same category =
  // a substitute, e.g. another oil, not a complement). Score = sum over
  // shared tags of 1/ln(1 + tag size), so a narrow kit tag ("Shoei Neotec 3
  // აქსესუარები", a handful of products) outweighs a broad one carried by
  // hundreds; ties go to the more viewed product. Eligibility (stock,
  // purchasability, vehicle fit) is applied afterwards by the caller.
  findCompanionCandidateIds(productId: number, categoryId: number, poolSize: number) {
    return prisma.$queryRaw<{ id: number }[]>`
      WITH anchor_tags AS (
        SELECT pt."tagId"
        FROM "dbo"."ProductTag" pt
        JOIN "cla"."Tag" t ON t."id" = pt."tagId" AND t."isActive" = true
        WHERE pt."productId" = ${productId}
      ),
      tag_sizes AS (
        SELECT pt."tagId", COUNT(*)::float8 AS size
        FROM "dbo"."ProductTag" pt
        WHERE pt."tagId" IN (SELECT "tagId" FROM anchor_tags)
        GROUP BY pt."tagId"
      )
      SELECT p."id"
      FROM "dbo"."ProductTag" pt
      JOIN tag_sizes ts ON ts."tagId" = pt."tagId"
      JOIN "dbo"."Product" p ON p."id" = pt."productId"
      WHERE pt."productId" <> ${productId} AND p."categoryId" <> ${categoryId}
      GROUP BY p."id", p."viewCount"
      ORDER BY SUM(1.0 / LN(1 + ts.size)) DESC, p."viewCount" DESC, p."id" ASC
      LIMIT ${poolSize}
    `;
  },

  countProductsByIds(ids: number[]) {
    return prisma.product.count({ where: { id: { in: ids } } });
  },

  addTagToProducts(tagId: number, productIds: number[]) {
    return prisma.productTag.createMany({
      data: productIds.map((productId) => ({ productId, tagId })),
      skipDuplicates: true,
    });
  },

  removeTagFromProducts(tagId: number, productIds: number[]) {
    return prisma.productTag.deleteMany({ where: { tagId, productId: { in: productIds } } });
  },

  // Replaces a product's whole tag set atomically.
  replaceProductTags(productId: number, tagIds: number[]) {
    return prisma.$transaction([
      prisma.productTag.deleteMany({ where: { productId } }),
      prisma.productTag.createMany({ data: tagIds.map((tagId) => ({ productId, tagId })) }),
    ]);
  },
};
