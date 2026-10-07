import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { parseMoney } from '../src/domain/money.ts';
import {
  accessibilityAmount,
  currencyLabel,
  formatDisplayAmount,
  formatSigned,
  normalizeAmountInput,
} from '../app/src/lib/format.ts';
import { TX_KINDS, describeTransaction } from '../app/src/lib/describe.ts';
import { displayCategoryName } from '../app/src/lib/categories.ts';
import { STRINGS } from '../app/src/i18n.ts';
import { EMPTY_FILTER, activeFilterCount, filterTransactions, sortNewestFirst } from '../app/src/lib/filters.ts';
import { snapshotEntries } from '../app/src/lib/snapshot.ts';
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
  assert.ok(accessibilityAmount(-100n, 'ARS', { minus: 'minus', plus: 'plus', zero: 'zero' }, 'en-US').startsWith('minus'));
  assert.ok(
    accessibilityAmount(0n, 'ARS', { minus: 'menos', plus: 'más', zero: 'cero' }, 'es-AR').startsWith('cero'),
  );
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
  assert.equal(STRINGS.en.kinds[conv.kind], 'Conversion');
  assert.equal(STRINGS.es.kinds[conv.kind], 'Conversión');
  assert.equal(STRINGS.es.showAll(847), 'Mostrar todo (847)');
  assert.equal(STRINGS.en.showAll(847), 'Show all (847)');
  assert.equal(STRINGS.es.usedIn(1), 'Usada en 1 movimiento');
  assert.equal(STRINGS.en.usedIn(2), 'Used in 2 postings');
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

function throwsCode(fn: () => void, code: string): void {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError, `expected DomainError, got ${String(error)}`);
    assert.equal(error.code, code);
    return;
  }
  assert.fail(`expected DomainError ${code} but nothing was thrown`);
}

test('seed category names localize without touching stored data', () => {
  const seed = { id: 'cat:food', name: 'Food', kind: 'expense' } as const;
  assert.equal(displayCategoryName(seed, STRINGS.es), 'Comida');
  assert.equal(displayCategoryName(seed, STRINGS.en), 'Food');
  assert.equal(displayCategoryName({ ...seed, name: 'Comida' }, STRINGS.es), 'Comida');
  assert.equal(displayCategoryName({ id: 'custom', name: 'Custom', kind: 'expense' }, STRINGS.es), 'Custom');
  const tx = expense({ refs, id: 'l1', date: TODAY, account: acct('bank-ars'), amount: money(100n, 'ARS'), category: cat('food') });
  assert.equal(describeTransaction(tx, accounts, categories, STRINGS.es).title, 'Food');
});

test('hostile entry input fails safely through the same path the UI uses', () => {
  assert.equal(normalizeAmountInput('   '), '');
  assert.equal(normalizeAmountInput('1 000'), '1000');
  throwsCode(() => parseMoney(normalizeAmountInput('−100'), 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney(normalizeAmountInput('1.005'), 'USD'), 'EXCESS_DECIMALS');
  throwsCode(() => parseMoney(normalizeAmountInput('1000.5'), 'CLP'), 'EXCESS_DECIMALS');
  throwsCode(() => parseMoney('9'.repeat(100), 'ARS'), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => parseMoney('', 'ARS'), 'INVALID_MONEY_FORMAT');
  assert.equal(parseMoney(normalizeAmountInput('-5'), 'ARS').amount, -500n);
  assert.equal(parseMoney(normalizeAmountInput('0'), 'ARS').amount, 0n);
});

test('home snapshot totals every visible currency, counts single-currency accounts, excludes equity', () => {
  const txs = [
    expense({ refs, id: 's1', date: TODAY, account: acct('bank-ars'), amount: money(500n, 'ARS'), category: cat('food') }),
    transfer({ refs, id: 's2', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(100n, 'ARS') }),
  ];
  const entries = snapshotEntries([acct('bank-ars'), acct('cash-ars'), acct('card-ars'), acct('bank-usd'), acct('opening-ars')], txs);
  assert.deepEqual(entries.map((e) => e.currency), ['ARS', 'USD']);
  const ars = entries[0]!;
  const usd = entries[1]!;
  assert.equal(ars.total, -500n);
  assert.equal(ars.count, 3);
  assert.equal(usd.total, 0n);
  assert.equal(usd.count, 1);
  assert.equal(snapshotEntries([], txs).length, 0);
});

test('row details localize through the same describe path the UI uses', () => {
  const [, , transferTx, cardTx, convTx] = sampleLedger();
  assert.equal(describeTransaction(transferTx!, accounts, categories, STRINGS.es).detail, 'Transferencia entre cuentas');
  assert.equal(describeTransaction(transferTx!, accounts, categories, STRINGS.en).detail, 'Transfer between accounts');
  assert.equal(describeTransaction(cardTx!, accounts, categories, STRINGS.es).detail, 'Pago a tarjeta de crédito');
  assert.equal(describeTransaction(cardTx!, accounts, categories, STRINGS.en).detail, 'Credit card payment');
  assert.equal(describeTransaction(convTx!, accounts, categories, STRINGS.es).detail, 'Tasa 1180');
  assert.equal(describeTransaction(convTx!, accounts, categories, STRINGS.en).detail, 'Rate 1180');
});
