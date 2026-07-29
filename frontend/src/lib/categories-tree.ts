import type { Category } from "@/lib/api/categories";

export type CategoryNode = Category & { depth: number };

export function flattenTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<number | null, Category[]>();
  for (const category of categories) {
    const key = category.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(category);
  }

  const result: CategoryNode[] = [];

  function walk(parentId: number | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ ...child, depth });
      walk(child.id, depth + 1);
    }
  }

  walk(null, 0);
  return result;
}

export function getRootCategory(categories: Category[], categoryId: number): Category | null {
  const byId = new Map(categories.map((category) => [category.id, category]));
  let current = byId.get(categoryId) ?? null;
  while (current && current.parentId !== null) {
    current = byId.get(current.parentId) ?? null;
  }
  return current;
}

export function getDescendantIds(categories: Category[], id: number): Set<number> {
  const byParent = new Map<number, Category[]>();
  for (const category of categories) {
    if (category.parentId == null) continue;
    if (!byParent.has(category.parentId)) byParent.set(category.parentId, []);
    byParent.get(category.parentId)!.push(category);
  }

  const result = new Set<number>();

  function walk(currentId: number) {
    const children = byParent.get(currentId) ?? [];
    for (const child of children) {
      result.add(child.id);
      walk(child.id);
    }
  }

  walk(id);
  return result;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
