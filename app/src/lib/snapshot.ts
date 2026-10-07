import { accountBalances, currencyTotals } from '../../../src/domain/balances.ts';
import type { Account, Transaction } from '../../../src/domain/types.ts';

export interface SnapshotEntry {
  readonly currency: string;
  readonly total: bigint;
  readonly count: number;
}

export function snapshotEntries(accounts: readonly Account[], transactions: readonly Transaction[]): SnapshotEntry[] {
  const visible = accounts.filter((a) => a.type === 'ASSET' || a.type === 'LIABILITY');
  const balances = accountBalances(transactions);
  const totals = currencyTotals(balances, visible.map((a) => a.id));
  const counts = new Map<string, number>();
  for (const account of visible) {
    counts.set(account.currency, (counts.get(account.currency) ?? 0) + 1);
  }
  const currencies = new Set([...totals.keys(), ...counts.keys()]);
  return [...currencies]
    .sort()
    .map((currency) => ({ currency, total: totals.get(currency) ?? 0n, count: counts.get(currency) ?? 0 }));
}
