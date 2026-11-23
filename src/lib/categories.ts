import type { StoreCategory } from '@/types';

/** Main categories followed each by its sub-categories (a store can be in either). */
export const flattenCategories = (mains: StoreCategory[]): StoreCategory[] =>
  mains.flatMap((m) => [m, ...(m.subCategories ?? [])]);

/** The main category of [id]: itself when it is a main category, else the one it is inside. */
export const mainCategoryOf = (mains: StoreCategory[], id: number | null): StoreCategory | undefined =>
  id === null ? undefined : mains.find((m) => m.id === id || (m.subCategories ?? []).some((s) => s.id === id));

/** The category ids a filter on [id] covers: a main category covers its sub-categories too. */
export const categoryIdsFor = (mains: StoreCategory[], id: number): Set<number> => {
  const main = mains.find((m) => m.id === id);
  return new Set(main ? [main.id, ...(main.subCategories ?? []).map((s) => s.id)] : [id]);
};
