import type { Transaction } from './types.ts';

export function accountBalances(transactions: readonly Transaction[]): ReadonlyMap<string, ReadonlyMap<string, bigint>> {
  const out = new Map<string, Map<string, bigint>>();
  for (const tx of transactions) {
    for (const posting of tx.postings) {
      let currencies = out.get(posting.accountId);
      if (!currencies) {
        currencies = new Map<string, bigint>();
        out.set(posting.accountId, currencies);
      }
      currencies.set(posting.currency, (currencies.get(posting.currency) ?? 0n) + posting.amount);
    }
  }
  return out;
}
