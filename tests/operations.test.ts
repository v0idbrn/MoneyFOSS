import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';
import {
  buildTransaction,
  cardPayment,
  cardPurchase,
  exchange,
  expense,
  income,
  transfer,
} from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function view(tx: Transaction) {
  return tx.postings.map((posting) => ({
    accountId: posting.accountId,
    currency: posting.currency,
    amount: posting.amount,
    kind: posting.kind,
    ...(posting.categoryId !== undefined ? { categoryId: posting.categoryId } : {}),
  }));
}

function throwsCode(fn: () => void, code: string): void {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError, `expected DomainError, got ${String(error)}`);
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
    return;
  }
  assert.fail(`expected DomainError ${code} but nothing was thrown`);
}

test('case 1: ARS expense from bank', () => {
  const tx = expense({ refs, id: 'c1', date: TODAY, account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food') });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: -1000000n, kind: 'normal' },
    { accountId: 'sys:expense', currency: 'ARS', amount: 1000000n, kind: 'normal', categoryId: 'food' },
  ]);
  assert.equal(tx.conversion, undefined);
});

test('case 2: ARS salary income', () => {
  const tx = income({ refs, id: 'c2', date: TODAY, account: acct('bank-ars'), amount: money(10000000n, 'ARS'), category: cat('salary') });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: 10000000n, kind: 'normal' },
    { accountId: 'sys:income', currency: 'ARS', amount: -10000000n, kind: 'normal', categoryId: 'salary' },
  ]);
});

test('case 3: ARS cash to bank transfer carries no category', () => {
  const tx = transfer({ refs, id: 'c3', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') });
  assert.deepEqual(view(tx), [
    { accountId: 'cash-ars', currency: 'ARS', amount: -500000n, kind: 'normal' },
    { accountId: 'bank-ars', currency: 'ARS', amount: 500000n, kind: 'normal' },
  ]);
});

test('case 4: USD expense from USD account', () => {
  const tx = expense({ refs, id: 'c4', date: TODAY, account: acct('bank-usd'), amount: money(2000n, 'USD'), category: cat('food') });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-usd', currency: 'USD', amount: -2000n, kind: 'normal' },
    { accountId: 'sys:expense', currency: 'USD', amount: 2000n, kind: 'normal', categoryId: 'food' },
  ]);
});

test('case 5: USD freelance income', () => {
  const tx = income({ refs, id: 'c5', date: TODAY, account: acct('bank-usd'), amount: money(50000n, 'USD'), category: cat('freelance') });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-usd', currency: 'USD', amount: 50000n, kind: 'normal' },
    { accountId: 'sys:income', currency: 'USD', amount: -50000n, kind: 'normal', categoryId: 'freelance' },
  ]);
});

test('case 6: card purchase leaves the liability at -10.000,00', () => {
  const tx = cardPurchase({ refs, id: 'c6', date: TODAY, account: acct('card-ars'), amount: money(1000000n, 'ARS'), category: cat('food') });
  assert.deepEqual(view(tx), [
    { accountId: 'card-ars', currency: 'ARS', amount: -1000000n, kind: 'normal' },
    { accountId: 'sys:expense', currency: 'ARS', amount: 1000000n, kind: 'normal', categoryId: 'food' },
  ]);
});

test('case 7: card payment from bank is not an expense', () => {
  const tx = cardPayment({ refs, id: 'c7', date: TODAY, from: acct('bank-ars'), to: acct('card-ars'), amount: money(1000000n, 'ARS') });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: -1000000n, kind: 'normal' },
    { accountId: 'card-ars', currency: 'ARS', amount: 1000000n, kind: 'normal' },
  ]);
});

test('case 8: 100.000,00 ARS -> 84,75 USD at 1180 with bridge pair', () => {
  const tx = exchange({
    refs,
    id: 'c8',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
  });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: -10000000n, kind: 'normal' },
    { accountId: 'sys:fx:ARS', currency: 'ARS', amount: 10000000n, kind: 'bridge' },
    { accountId: 'sys:fx:USD', currency: 'USD', amount: -8475n, kind: 'bridge' },
    { accountId: 'bank-usd', currency: 'USD', amount: 8475n, kind: 'normal' },
  ]);
  assert.deepEqual(tx.conversion, {
    fromCurrency: 'ARS',
    toCurrency: 'USD',
    rateText: '1180',
    rateRatio: { num: 1180n, den: 1n },
    quoteDirection: 'srcPerDest',
    rateAt: '2026-10-04T12:00:00Z',
    source: 'manual',
    roundingMode: 'half-away-from-zero',
  });
});

test('case 9: 10.000,00 ARS price paid from USD account', () => {
  const tx = expense({
    refs,
    id: 'c9',
    date: TODAY,
    account: acct('bank-usd'),
    amount: money(1000000n, 'ARS'),
    category: cat('food'),
    rate: RATE_1180,
  });
  assert.deepEqual(view(tx), [
    { accountId: 'sys:expense', currency: 'ARS', amount: 1000000n, kind: 'normal', categoryId: 'food' },
    { accountId: 'sys:fx:ARS', currency: 'ARS', amount: -1000000n, kind: 'bridge' },
    { accountId: 'sys:fx:USD', currency: 'USD', amount: 847n, kind: 'bridge' },
    { accountId: 'bank-usd', currency: 'USD', amount: -847n, kind: 'normal' },
  ]);
  assert.equal(tx.conversion?.fromCurrency, 'ARS');
  assert.equal(tx.conversion?.toCurrency, 'USD');
});

test('case 10: conversion with 500,00 ARS fee derives from the net amount', () => {
  const tx = exchange({
    refs,
    id: 'c10',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
    fee: { amount: money(50000n, 'ARS'), category: cat('fees') },
  });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: -10000000n, kind: 'normal' },
    { accountId: 'sys:expense', currency: 'ARS', amount: 50000n, kind: 'normal', categoryId: 'fees' },
    { accountId: 'sys:fx:ARS', currency: 'ARS', amount: 9950000n, kind: 'bridge' },
    { accountId: 'sys:fx:USD', currency: 'USD', amount: -8432n, kind: 'bridge' },
    { accountId: 'bank-usd', currency: 'USD', amount: 8432n, kind: 'normal' },
  ]);
});

test('fee charged in destination currency: gross derived, then deducted', () => {
  const tx = exchange({
    refs,
    id: 'fee-usd',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
    fee: { amount: money(43n, 'USD'), category: cat('fees') },
  });
  assert.deepEqual(view(tx), [
    { accountId: 'bank-ars', currency: 'ARS', amount: -10000000n, kind: 'normal' },
    { accountId: 'sys:fx:ARS', currency: 'ARS', amount: 10000000n, kind: 'bridge' },
    { accountId: 'sys:fx:USD', currency: 'USD', amount: -8475n, kind: 'bridge' },
    { accountId: 'bank-usd', currency: 'USD', amount: 8432n, kind: 'normal' },
    { accountId: 'sys:expense', currency: 'USD', amount: 43n, kind: 'normal', categoryId: 'fees' },
  ]);
});

test('mixed-currency payment without a rate balances per currency (rule 6)', () => {
  const tx = buildTransaction({
    refs,
    id: 'mixed',
    date: TODAY,
    postings: [
      { accountId: 'sys:expense', currency: 'ARS', amount: 500000n, kind: 'normal', categoryId: 'food' },
      { accountId: 'cash-ars', currency: 'ARS', amount: -500000n, kind: 'normal' },
      { accountId: 'sys:expense', currency: 'USD', amount: 2000n, kind: 'normal', categoryId: 'food' },
      { accountId: 'bank-usd', currency: 'USD', amount: -2000n, kind: 'normal' },
    ],
  });
  assert.equal(tx.conversion, undefined);
  assert.equal(tx.postings.length, 4);
});

test('guardrails: every misuse fails loudly before validation', () => {
  const expenseInput = { refs, id: 'g', date: TODAY, account: acct('bank-ars'), amount: money(1000n, 'ARS'), category: cat('food') };
  throwsCode(
    () => expense({ ...expenseInput, account: acct('bank-usd') }),
    'CROSS_CURRENCY_REQUIRES_RATE',
  );
  throwsCode(
    () => expense({ ...expenseInput, amount: money(0n, 'ARS') }),
    'AMOUNT_MUST_BE_POSITIVE',
  );
  throwsCode(() => expense({ ...expenseInput, category: cat('salary') }), 'CATEGORY_KIND_MISMATCH');
  throwsCode(
    () => expense({ ...expenseInput, rate: RATE_1180 }),
    'UNEXPECTED_RATE',
  );

  throwsCode(
    () => income({ refs, id: 'g', date: TODAY, account: acct('bank-usd'), amount: money(1000n, 'ARS'), category: cat('salary') }),
    'CROSS_CURRENCY_REQUIRES_RATE',
  );

  const transferInput = { refs, id: 'g', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(1000n, 'ARS') };
  throwsCode(() => transfer({ ...transferInput, to: acct('bank-usd') }), 'CROSS_CURRENCY_REQUIRES_RATE');
  throwsCode(() => transfer({ ...transferInput, to: acct('cash-ars') }), 'SAME_ACCOUNT_TRANSFER');

  throwsCode(() => cardPurchase({ ...expenseInput, account: acct('bank-ars') }), 'ACCOUNT_TYPE_MISMATCH');
  throwsCode(() => cardPayment({ ...transferInput, to: acct('bank-ars') }), 'ACCOUNT_TYPE_MISMATCH');

  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-ars'),
        amount: money(1000n, 'ARS'),
        rate: RATE_1180,
      }),
    'SAME_CURRENCY_EXCHANGE',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-usd'),
        to: acct('bank-ars'),
        amount: money(1000n, 'ARS'),
        rate: RATE_1180,
      }),
    'CURRENCY_MISMATCH',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(100n, 'ARS'),
        rate: RATE_1180,
      }),
    'DEGENERATE_CONVERSION',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(10000000n, 'ARS'),
        rate: RATE_1180,
        fee: { amount: money(10000000n, 'ARS'), category: cat('fees') },
      }),
    'FEE_EXCEEDS_AMOUNT',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(10000000n, 'ARS'),
        rate: RATE_1180,
        fee: { amount: money(1n, 'EUR'), category: cat('fees') },
      }),
    'FEE_CURRENCY_MISMATCH',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'g',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(10000000n, 'ARS'),
        rate: RATE_1180,
        fee: { amount: money(1n, 'ARS'), category: cat('salary') },
      }),
    'CATEGORY_KIND_MISMATCH',
  );
  throwsCode(
    () =>
      expense({
        refs,
        id: 'g',
        date: TODAY,
        account: acct('bank-usd'),
        amount: money(1000n, 'ARS'),
        category: cat('food'),
        rate: { ...RATE_1180, text: 'not-a-rate' },
      }),
    'INVALID_RATE_FORMAT',
  );
});
