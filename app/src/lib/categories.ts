import { SEED_CATEGORIES } from './seed-categories.ts';
import type { Dict } from '../i18n.ts';
import type { Category } from '../../../src/domain/types.ts';

const ENGLISH_DEFAULTS: ReadonlyMap<string, string> = new Map(SEED_CATEGORIES.map((c) => [c.id, c.name]));

export function displayCategoryName(category: Category, t: Dict): string {
  if (category.name === ENGLISH_DEFAULTS.get(category.id)) {
    const translated = (t.seedCategoryNames as Readonly<Record<string, string>>)[category.id];
    if (translated !== undefined) {
      return translated;
    }
  }
  return category.name;
}
