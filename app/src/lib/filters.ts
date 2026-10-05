import { describeTransaction, type TxKind } from './describe.ts';
import type { Account, Category, Transaction } from '../../../src/domain/types.ts';

export interface TxFilter {
  readonly text: string;
  readonly accountId: string | null;
  readonly categoryId: string | null;
  readonly kind: TxKind | null;
}

export const EMPTY_FILTER: TxFilter = { text: '', accountId: null, categoryId: null, kind: null };

export function activeFilterCount(filter: TxFilter): number {
  let count = 0;
  if (filter.text.trim().length > 0) {
    count += 1;
  }
  if (filter.accountId !== null) {
    count += 1;
  }
  if (filter.categoryId !== null) {
    count += 1;
  }
  if (filter.kind !== null) {
    count += 1;
  }
  return count;
}

export function filterTransactions(
  txs: readonly Transaction[],
  filter: TxFilter,
  accounts: ReadonlyMap<string, Account>,
  categories: ReadonlyMap<string, Category>,
): Transaction[] {
  const needle = filter.text.trim().toLowerCase();
  return txs.filter((tx) => {
    if (filter.accountId !== null && !tx.postings.some((posting) => posting.accountId === filter.accountId)) {
      return false;
    }
    if (filter.categoryId !== null && !tx.postings.some((posting) => posting.categoryId === filter.categoryId)) {
      return false;
    }
    const view = describeTransaction(tx, accounts, categories);
    if (filter.kind !== null && view.kind !== filter.kind) {
      return false;
    }
    if (needle.length === 0) {
      return true;
    }
    const names = tx.postings.map((posting) => {
      if (posting.categoryId !== undefined) {
        return categories.get(posting.categoryId)?.name ?? '';
      }
      return accounts.get(posting.accountId)?.name ?? posting.accountId;
    });
    const haystack = [tx.id, tx.memo ?? '', view.title, view.detail, ...names].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortNewestFirst(txs: readonly Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));
}
