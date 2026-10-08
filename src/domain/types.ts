import type { Ratio, RoundingMode } from './money.ts';
import { convertMinor } from './money.ts';
import { getCurrency } from './currency.ts';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY';
export type PostingKind = 'normal' | 'bridge';
export type QuoteDirection = 'srcPerDest' | 'destPerSrc';
export type RateSource = 'manual' | 'institution' | 'file';

export const QUOTE_DIRECTIONS: readonly QuoteDirection[] = ['srcPerDest', 'destPerSrc'];
export const RATE_SOURCES: readonly RateSource[] = ['manual', 'institution', 'file'];
export const POSTING_KINDS: readonly PostingKind[] = ['normal', 'bridge'];

export const SYSTEM_INCOME_ID = 'sys:income';
export const SYSTEM_EXPENSE_ID = 'sys:expense';
export const FX_ACCOUNT_PREFIX = 'sys:fx:';

export function fxAccountId(currency: string): string {
  return `${FX_ACCOUNT_PREFIX}${currency}`;
}

export function fxAccountCurrency(accountId: string): string | null {
  return accountId.startsWith(FX_ACCOUNT_PREFIX) ? accountId.slice(FX_ACCOUNT_PREFIX.length) : null;
}

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly kind: 'income' | 'expense';
}

export interface Budget {
  readonly id: string;
  readonly categoryId: string;
  readonly currency: string;
  readonly amountMinor: bigint;
}

export function budgetId(categoryId: string, currency: string): string {
  return `${categoryId}@${currency}`;
}

export interface Goal {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly targetMinor: bigint;
  readonly targetDate?: string;
  readonly accountIds: readonly string[];
}

export function goalId(name: string, currency: string): string {
  return `goal-${currency}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

export interface Posting {
  readonly accountId: string;
  readonly currency: string;
  readonly amount: bigint;
  readonly kind: PostingKind;
  readonly categoryId?: string;
}

export interface Conversion {
  readonly fromCurrency: string;
  readonly toCurrency: string;
  readonly rateText: string;
  readonly rateRatio: Ratio;
  readonly quoteDirection: QuoteDirection;
  readonly rateAt: string;
  readonly source: RateSource;
  readonly roundingMode: RoundingMode;
}

export interface Transaction {
  readonly id: string;
  readonly date: string;
  readonly postings: readonly Posting[];
  readonly conversion?: Conversion;
  readonly memo?: string;
}

export interface LedgerRefs {
  readonly accounts: ReadonlyMap<string, Account>;
  readonly categories: ReadonlyMap<string, Category>;
}

export function conversionEffectiveRatio(conv: Conversion): Ratio {
  return conv.quoteDirection === 'destPerSrc'
    ? { num: conv.rateRatio.num, den: conv.rateRatio.den }
    : { num: conv.rateRatio.den, den: conv.rateRatio.num };
}

export function deriveConversionDest(conv: Conversion, srcMinor: bigint): bigint {
  const effective = conversionEffectiveRatio(conv);
  const srcExponent = getCurrency(conv.fromCurrency).exponent;
  const destExponent = getCurrency(conv.toCurrency).exponent;
  return convertMinor(srcMinor, srcExponent, destExponent, effective.num, effective.den, conv.roundingMode);
}
