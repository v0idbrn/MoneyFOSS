import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { accountBalances, currencyTotals } from '../src/domain/balances.ts';
import { cardPayment, exchange, expense, income, transfer } from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';

test('balances are pure per-account per-currency sums over validated transactions', () => {
  const txs = [
    expense({ refs, id: 'b1', date: TODAY, account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food') }),
    income({ refs, id: 'b2', date: TODAY, account: acct('bank-ars'), amount: money(10000000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'b3', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') }),
    cardPayment({ refs, id: 'b4', date: TODAY, from: acct('bank-ars'), to: acct('card-ars'), amount: money(1000000n, 'ARS') }),
  ];
  const balances = accountBalances(txs);
  assert.equal(balances.get('bank-ars')?.get('ARS'), 8500000n);
  assert.equal(balances.get('cash-ars')?.get('ARS'), -500000n);
  assert.equal(balances.get('card-ars')?.get('ARS'), 1000000n);
  assert.equal(balances.get('sys:expense')?.get('ARS'), 1000000n);
  assert.equal(balances.get('sys:income')?.get('ARS'), -10000000n);
});

test('empty ledger yields no balances; order does not matter', () => {
  assert.equal(accountBalances([]).size, 0);
  const a = expense({ refs, id: 'o1', date: TODAY, account: acct('bank-ars'), amount: money(100n, 'ARS'), category: cat('food') });
  const b = income({ refs, id: 'o2', date: TODAY, account: acct('bank-ars'), amount: money(200n, 'ARS'), category: cat('salary') });
  assert.deepEqual(accountBalances([a, b]), accountBalances([b, a]));
});

test('conversion moves value across currencies without creating any', () => {
  const txs = [
    exchange({ refs, id: 'fx', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
  ];
  const balances = accountBalances(txs);
  assert.equal(balances.get('bank-ars')?.get('ARS'), -10000000n);
  assert.equal(balances.get('bank-usd')?.get('USD'), 8475n);
  assert.equal(balances.get('sys:fx:ARS')?.get('ARS'), 10000000n);
  assert.equal(balances.get('sys:fx:USD')?.get('USD'), -8475n);
});

test('currencyTotals sums a filtered account set per currency', () => {
  const txs = [
    expense({ refs, id: 't1', date: TODAY, account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food') }),
    expense({ refs, id: 't2', date: TODAY, account: acct('bank-usd'), amount: money(2000n, 'USD'), category: cat('food') }),
    transfer({ refs, id: 't3', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') }),
  ];
  const balances = accountBalances(txs);
  const totals = currencyTotals(balances, ['bank-ars', 'bank-usd', 'cash-ars']);
  assert.equal(totals.get('ARS'), -1000000n);
  assert.equal(totals.get('USD'), -2000n);
  assert.equal(currencyTotals(balances, ['ghost']).size, 0);
  assert.equal(currencyTotals(balances, []).size, 0);
});
