import type { Category } from '../../../src/domain/types.ts';

export const SEED_CATEGORIES: readonly Category[] = [
  { id: 'cat:food', name: 'Food', kind: 'expense' },
  { id: 'cat:transport', name: 'Transport', kind: 'expense' },
  { id: 'cat:housing', name: 'Housing', kind: 'expense' },
  { id: 'cat:health', name: 'Health', kind: 'expense' },
  { id: 'cat:education', name: 'Education', kind: 'expense' },
  { id: 'cat:entertainment', name: 'Entertainment', kind: 'expense' },
  { id: 'cat:shopping', name: 'Shopping', kind: 'expense' },
  { id: 'cat:other-expense', name: 'Other', kind: 'expense' },
  { id: 'cat:salary', name: 'Salary', kind: 'income' },
  { id: 'cat:freelance', name: 'Freelance', kind: 'income' },
  { id: 'cat:other-income', name: 'Other', kind: 'income' },
];

export type SeedCategoryId = (typeof SEED_CATEGORIES)[number]['id'];
