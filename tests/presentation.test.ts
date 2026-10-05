import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accessibilityAmount,
  currencyLabel,
  formatDisplayAmount,
  formatSigned,
  normalizeAmountInput,
} from '../app/src/lib/format.ts';
import { TX_KIND_LABELS, describeTransaction } from '../app/src/lib/describe.ts';
import { EMPTY_FILTER, activeFilterCount, filterTransactions, sortNewestFirst } from '../app/src/lib/filters.ts';
import { money } from '../src/domain/money.ts';
import { cardPayment, exchange, expense, income, transfer } from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

const accounts = new Map([...refs.accounts].map(([id, a]) => [id, a] as const));
const categories = new Map([...refs.categories].map(([id, c]) => [id, c] as const));

function sampleLedger(): Transaction[] {
  return [
    expense({ refs, id: 'u1', date: '2026-10-01', account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food'), memo: 'groceries' }),
    income({ refs, id: 'u2', date: '2026-10-02', account: acct('bank-ars'), amount: money(10000000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'u3', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') }),
    cardPayment({ refs, id: 'u4', date: TODAY, from: acct('bank-ars'), to: acct('card-ars'), amount: money(1000000n, 'ARS') }),
    exchange({ refs, id: 'u5', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
  ];
}

test('display amounts group without float and stay exact', () => {
  assert.equal(formatDisplayAmount(1000000n, 'ARS', 'en-US'), '10,000.00');
  assert.equal(formatDisplayAmount(1000000n, 'ARS', 'es-AR'), '10.000.00');
  assert.equal(formatDisplayAmount(-500n, 'ARS', 'en-US'), '-5.00');
  assert.equal(formatDisplayAmount(0n, 'ARS', 'en-US'), '0.00');
  assert.equal(formatDisplayAmount(1000n, 'CLP', 'en-US'), '1,000');
  assert.equal(formatDisplayAmount(1234n, 'KWD', 'en-US'), '1.234');
  assert.equal(formatDisplayAmount(9007199254740993n, 'ARS', 'en-US'), '90,071,992,547,409.93');
  assert.equal(formatSigned(100n, 'ARS', 'en-US'), '+1.00');
  assert.equal(formatSigned(-100n, 'ARS', 'en-US'), '-1.00');
  assert.equal(formatSigned(0n, 'ARS', 'en-US'), '0.00');
  assert.equal(currencyLabel('ARS'), '$ ARS');
  assert.ok(accessibilityAmount(-100n, 'ARS', 'en-US').startsWith('minus'));
});

test('amount input normalization accepts a single decimal comma, rejects ambiguity', () => {
  assert.equal(normalizeAmountInput('1,50'), '1.50');
  assert.equal(normalizeAmountInput('  10.00  '), '10.00');
  assert.equal(normalizeAmountInput('1.000,00'), '1.000,00');
});

test('transaction descriptions classify every operation kind', () => {
  const [e, i, t, c, x] = sampleLedger();
  assert.equal(describeTransaction(e!, accounts, categories).kind, 'expense');
  assert.equal(describeTransaction(e!, accounts, categories).title, 'Food');
  assert.equal(describeTransaction(i!, accounts, categories).kind, 'income');
  assert.equal(describeTransaction(i!, accounts, categories).title, 'Salary');
  assert.equal(describeTransaction(t!, accounts, categories).kind, 'transfer');
  assert.equal(describeTransaction(t!, accounts, categories).title, 'Cash → Bank ARS');
  assert.equal(describeTransaction(c!, accounts, categories).kind, 'card-payment');
  const conv = describeTransaction(x!, accounts, categories);
  assert.equal(conv.kind, 'conversion');
  assert.equal(conv.title, 'ARS → USD');
  assert.equal(TX_KIND_LABELS[conv.kind], 'Conversion');
});

test('filters combine text, account, category and kind, and stay reversible', () => {
  const txs = sampleLedger();
  assert.equal(filterTransactions(txs, EMPTY_FILTER, accounts, categories).length, 5);
  assert.equal(activeFilterCount(EMPTY_FILTER), 0);
  assert.equal(filterTransactions(txs, { ...EMPTY_FILTER, text: 'groceries' }, accounts, categories).length, 1);
  assert.equal(filterTransactions(txs, { ...EMPTY_FILTER, text: 'GROCERIES' }, accounts, categories).length, 1);
  assert.equal(filterTransactions(txs, { ...EMPTY_FILTER, accountId: 'cash-ars' }, accounts, categories).length, 1);
  assert.equal(filterTransactions(txs, { ...EMPTY_FILTER, categoryId: 'food' }, accounts, categories).length, 1);
  assert.equal(filterTransactions(txs, { ...EMPTY_FILTER, kind: 'conversion' }, accounts, categories).length, 1);
  assert.equal(
    filterTransactions(txs, { ...EMPTY_FILTER, kind: 'expense', accountId: 'bank-usd' }, accounts, categories).length,
    0,
  );
  assert.equal(activeFilterCount({ ...EMPTY_FILTER, text: 'x', kind: 'income' }), 2);
});

test('history sorts newest first with a stable tiebreak', () => {
  const txs = sampleLedger();
  const sorted = sortNewestFirst(txs);
  assert.equal(sorted[0]!.date, TODAY);
  assert.equal(sorted[sorted.length - 1]!.id, 'u1');
});
