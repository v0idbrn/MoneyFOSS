import { money } from '../src/domain/money.ts';
import type { RateInput } from '../src/domain/operations.ts';
import type { Account, Category, LedgerRefs } from '../src/domain/types.ts';

export const TODAY = '2026-10-04';
export const RATE_AT = '2026-10-04T12:00:00Z';

export const RATE_1180: RateInput = {
  text: '1180',
  quoteDirection: 'srcPerDest',
  rateAt: RATE_AT,
  source: 'manual',
};

export const refs: LedgerRefs = {
  accounts: new Map<string, Account>([
    ['bank-ars', { id: 'bank-ars', name: 'Bank ARS', type: 'ASSET', currency: 'ARS' }],
    ['bank-usd', { id: 'bank-usd', name: 'Bank USD', type: 'ASSET', currency: 'USD' }],
    ['cash-ars', { id: 'cash-ars', name: 'Cash', type: 'ASSET', currency: 'ARS' }],
    ['card-ars', { id: 'card-ars', name: 'Credit Card', type: 'LIABILITY', currency: 'ARS' }],
    ['opening-ars', { id: 'opening-ars', name: 'Opening Balance', type: 'EQUITY', currency: 'ARS' }],
  ]),
  categories: new Map<string, Category>([
    ['food', { id: 'food', name: 'Food', kind: 'expense' }],
    ['fees', { id: 'fees', name: 'Fees', kind: 'expense' }],
    ['salary', { id: 'salary', name: 'Salary', kind: 'income' }],
    ['freelance', { id: 'freelance', name: 'Freelance', kind: 'income' }],
  ]),
};

export function acct(id: string): Account {
  const account = refs.accounts.get(id);
  if (!account) {
    throw new Error(`fixture account missing: ${id}`);
  }
  return account;
}

export function cat(id: string): Category {
  const category = refs.categories.get(id);
  if (!category) {
    throw new Error(`fixture category missing: ${id}`);
  }
  return category;
}

export function ars(amount: bigint) {
  return money(amount, 'ARS');
}

export function usd(amount: bigint) {
  return money(amount, 'USD');
}
