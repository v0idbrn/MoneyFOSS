import { DomainError } from '../../../src/domain/errors.ts';
import type { Category, Transaction } from '../../../src/domain/types.ts';
import { isValidMonth, monthOfDate } from './budgets.ts';

export interface CurrencyFlow {
  readonly currency: string;
  readonly expense: bigint;
  readonly income: bigint;
}

export interface CategoryFlow {
  readonly categoryId: string;
  readonly currency: string;
  readonly total: bigint;
}

function assertMonth(month: string): void {
  if (!isValidMonth(month)) {
    throw new DomainError('INVALID_MONTH', `month must be a canonical YYYY-MM string, got ${JSON.stringify(month)}`);
  }
}

export function monthFlowTotals(transactions: readonly Transaction[], categories: readonly Category[], month: string): CurrencyFlow[] {
  assertMonth(month);
  const kindById = new Map(categories.map((category) => [category.id, category.kind]));
  const byCurrency = new Map<string, { expense: bigint; income: bigint }>();
  for (const tx of transactions) {
    if (monthOfDate(tx.date) !== month) {
      continue;
    }
    for (const posting of tx.postings) {
      if (posting.kind !== 'normal' || posting.categoryId === undefined) {
        continue;
      }
      const kind = kindById.get(posting.categoryId);
      if (kind === undefined) {
        continue;
      }
      const flow = byCurrency.get(posting.currency) ?? { expense: 0n, income: 0n };
      if (kind === 'expense') {
        flow.expense += posting.amount;
      } else {
        flow.income += -posting.amount;
      }
      byCurrency.set(posting.currency, flow);
    }
  }
  return [...byCurrency.entries()]
    .map(([currency, flow]) => ({ currency, expense: flow.expense, income: flow.income }))
    .sort((a, b) => (a.currency < b.currency ? -1 : a.currency > b.currency ? 1 : 0));
}

export function categoryFlowTotals(transactions: readonly Transaction[], categories: readonly Category[], month: string, kind: 'income' | 'expense'): CategoryFlow[] {
  assertMonth(month);
  const kindById = new Map(categories.map((category) => [category.id, category.kind]));
  const byKey = new Map<string, CategoryFlow>();
  for (const tx of transactions) {
    if (monthOfDate(tx.date) !== month) {
      continue;
    }
    for (const posting of tx.postings) {
      if (posting.kind !== 'normal' || posting.categoryId === undefined) {
        continue;
      }
      if (kindById.get(posting.categoryId) !== kind) {
        continue;
      }
      const key = `${posting.categoryId}@${posting.currency}`;
      const existing = byKey.get(key);
      const signed = kind === 'expense' ? posting.amount : -posting.amount;
      if (existing === undefined) {
        byKey.set(key, { categoryId: posting.categoryId, currency: posting.currency, total: signed });
      } else {
        byKey.set(key, { ...existing, total: existing.total + signed });
      }
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.total === b.total ? (a.categoryId < b.categoryId ? -1 : 1) : a.total > b.total ? -1 : 1,
  );
}
