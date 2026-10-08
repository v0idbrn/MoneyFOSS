import { listCurrencies } from '../../../src/domain/currency.ts';
import { toWire } from '../../../src/domain/serialize.ts';
import type { Account, Budget, Category, Goal, Transaction } from '../../../src/domain/types.ts';
import { toCsv } from './csv.ts';

export const TRANSACTIONS_CSV_HEADER: readonly string[] = [
  'tx_id',
  'date',
  'position',
  'account_id',
  'account_name',
  'account_type',
  'currency',
  'amount_minor',
  'kind',
  'category_id',
  'category_name',
  'memo',
  'conv_from',
  'conv_to',
  'conv_rate_text',
  'conv_rate_num',
  'conv_rate_den',
  'conv_quote_direction',
  'conv_rate_at',
  'conv_source',
  'conv_rounding',
];

export const JSON_EXPORT_FORMAT = 'moneyfoss-export';
export const JSON_EXPORT_VERSION = 3;

export function transactionsCsv(
  transactions: readonly Transaction[],
  accounts: readonly Account[],
  categories: readonly Category[],
): string {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rows: string[][] = [[...TRANSACTIONS_CSV_HEADER]];
  for (const tx of transactions) {
    const wire = toWire(tx);
    wire.postings.forEach((posting, index) => {
      const account = accountById.get(posting.accountId);
      const category = posting.categoryId !== undefined ? categoryById.get(posting.categoryId) : undefined;
      const conversion = wire.conversion;
      rows.push([
        wire.id,
        wire.date,
        String(index),
        posting.accountId,
        account !== undefined ? account.name : posting.accountId,
        account !== undefined ? account.type : '',
        posting.currency,
        posting.amount,
        posting.kind,
        posting.categoryId ?? '',
        category !== undefined ? category.name : '',
        wire.memo ?? '',
        conversion?.fromCurrency ?? '',
        conversion?.toCurrency ?? '',
        conversion?.rateText ?? '',
        conversion?.rateRatio.num ?? '',
        conversion?.rateRatio.den ?? '',
        conversion?.quoteDirection ?? '',
        conversion?.rateAt ?? '',
        conversion?.source ?? '',
        conversion?.roundingMode ?? '',
      ]);
    });
  }
  return toCsv(rows);
}

export function exportJson(
  accounts: readonly Account[],
  categories: readonly Category[],
  transactions: readonly Transaction[],
  budgets: readonly Budget[],
  goals: readonly Goal[],
): string {
  return JSON.stringify(
    {
      format: JSON_EXPORT_FORMAT,
      version: JSON_EXPORT_VERSION,
      currencies: listCurrencies().map((currency) => ({ code: currency.code, exponent: currency.exponent })),
      accounts,
      categories,
      transactions: transactions.map(toWire),
      budgets: budgets.map((budget) => ({
        id: budget.id,
        category_id: budget.categoryId,
        currency: budget.currency,
        amount_minor: budget.amountMinor.toString(),
      })),
      goals: goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        currency: goal.currency,
        target_minor: goal.targetMinor.toString(),
        ...(goal.targetDate !== undefined ? { target_date: goal.targetDate } : {}),
        account_ids: goal.accountIds,
      })),
    },
    null,
    2,
  );
}
