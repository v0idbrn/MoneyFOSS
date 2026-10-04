import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';
import { exchange, expense, transfer } from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import { findTransactionProblems, assertTransaction } from '../src/domain/validate.ts';
import type { Posting, Transaction } from '../src/domain/types.ts';

function problems(tx: Transaction): string[] {
  return findTransactionProblems(tx, refs);
}

function has(list: string[], needle: string): void {
  assert.ok(
    list.some((problem) => problem.includes(needle)),
    `expected a problem containing ${JSON.stringify(needle)}, got:\n${list.join('\n') || '(none)'}`,
  );
}

function validExpense(): Transaction {
  return expense({ refs, id: 'v-exp', date: TODAY, account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food') });
}

function validExchange(): Transaction {
  return exchange({
    refs,
    id: 'v-ex',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
  });
}

test('valid transactions have zero problems', () => {
  assert.deepEqual(problems(validExpense()), []);
  assert.deepEqual(problems(validExchange()), []);
  assert.deepEqual(
    problems(transfer({ refs, id: 'v-tr', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') })),
    [],
  );
});

test('per-currency balance is exact: any drift is reported', () => {
  const tx = validExpense();
  const broken = {
    ...tx,
    postings: [
      { ...tx.postings[0]!, amount: tx.postings[0]!.amount + 1n },
      tx.postings[1]!,
    ] as Posting[],
  };
  const found = problems(broken);
  has(found, 'ARS does not balance');
  has(found, 'sum of amounts is 1');
});

test('every unbalanced currency is reported', () => {
  const tx: Transaction = {
    id: 'two-cur',
    date: TODAY,
    postings: [
      { accountId: 'bank-ars', currency: 'ARS', amount: -1000n, kind: 'normal' },
      { accountId: 'bank-usd', currency: 'USD', amount: 500n, kind: 'normal' },
    ],
  };
  const found = problems(tx);
  has(found, 'ARS does not balance');
  has(found, 'USD does not balance');
});

test('unknown account and unknown currency are rejected', () => {
  const tx: Transaction = {
    id: 'bad-refs',
    date: TODAY,
    postings: [
      { accountId: 'ghost', currency: 'ARS', amount: -1000n, kind: 'normal' },
      { accountId: 'sys:expense', currency: 'ARS', amount: 1000n, kind: 'normal', categoryId: 'food' },
    ],
  };
  has(problems(tx), 'unknown account "ghost"');

  const badCurrency: Transaction = {
    ...tx,
    postings: [
      { accountId: 'bank-ars', currency: 'XXX', amount: -1000n, kind: 'normal' },
      { accountId: 'sys:expense', currency: 'XXX', amount: 1000n, kind: 'normal', categoryId: 'food' },
    ],
  };
  has(problems(badCurrency), 'unknown currency "XXX"');
});

test('value account postings must use the account currency', () => {
  const tx: Transaction = {
    id: 'mixed-currency-bag',
    date: TODAY,
    postings: [
      { accountId: 'bank-usd', currency: 'ARS', amount: -1000n, kind: 'normal' },
      { accountId: 'sys:expense', currency: 'ARS', amount: 1000n, kind: 'normal', categoryId: 'food' },
    ],
  };
  has(problems(tx), 'posting currency is ARS');
});

test('category is forbidden outside sys:income/sys:expense', () => {
  const tx = validExpense();
  const withCategory: Transaction = {
    ...tx,
    postings: [{ ...tx.postings[0]!, categoryId: 'food' }, tx.postings[1]!],
  };
  has(problems(withCategory), 'category is forbidden on value account');

  const transferTx = transfer({ refs, id: 'tr-cat', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(100n, 'ARS') });
  const classified: Transaction = {
    ...transferTx,
    postings: [{ ...transferTx.postings[1]!, categoryId: 'food' }, transferTx.postings[1]!],
  };
  has(problems(classified), 'category is forbidden on value account');
});

test('category kind must match the system account', () => {
  const tx = validExpense();
  const wrongKind: Transaction = {
    ...tx,
    postings: [tx.postings[0]!, { ...tx.postings[1]!, categoryId: 'salary' }],
  };
  has(problems(wrongKind), 'is income but the posting is on sys:expense, which requires an expense category');

  const unknownCategory: Transaction = {
    ...tx,
    postings: [tx.postings[0]!, { ...tx.postings[1]!, categoryId: 'ghost' }],
  };
  has(problems(unknownCategory), 'unknown category "ghost"');
});

test('bridge postings and Conversion are linked 1:1', () => {
  const exchangeTx = validExchange();
  const noConversion: Transaction = { ...exchangeTx, conversion: undefined };
  has(problems(noConversion), 'bridge posting(s) without a Conversion record');

  const expenseTx = validExpense();
  const conversionOnly: Transaction = { ...expenseTx, conversion: exchangeTx.conversion };
  has(problems(conversionOnly), 'exactly 2 bridge postings, got 0');

  const oneBridge: Transaction = {
    ...exchangeTx,
    postings: exchangeTx.postings.filter((posting) => posting.accountId !== 'sys:fx:USD'),
  };
  has(problems(oneBridge), 'exactly 2 bridge postings, got 1');

  const threeBridges: Transaction = {
    ...exchangeTx,
    postings: [
      ...exchangeTx.postings,
      { accountId: 'sys:fx:EUR', currency: 'EUR', amount: -1n, kind: 'bridge' },
      { accountId: 'bank-ars', currency: 'ARS', amount: 1n, kind: 'normal' },
    ],
  };
  has(problems(threeBridges), 'exactly 2 bridge postings, got 3');
});

test('bridge placement rules: only on matching sys:fx accounts', () => {
  const expenseTx = validExpense();
  const bridgeOnValue: Transaction = {
    ...expenseTx,
    postings: [{ ...expenseTx.postings[0]!, kind: 'bridge' }, expenseTx.postings[1]!],
  };
  has(problems(bridgeOnValue), 'bridge postings are only allowed on FX system accounts');

  const normalOnFx: Transaction = {
    ...expenseTx,
    postings: [
      expenseTx.postings[0]!,
      expenseTx.postings[1]!,
      { accountId: 'sys:fx:ARS', currency: 'ARS', amount: -1n, kind: 'normal' },
      { accountId: 'bank-usd', currency: 'USD', amount: 1n, kind: 'normal' },
    ],
  };
  has(problems(normalOnFx), 'accepts only kind "bridge" postings');

  const exchangeTx = validExchange();
  const wrongBridgeCurrency: Transaction = {
    ...exchangeTx,
    postings: exchangeTx.postings.map((posting) =>
      posting.accountId === 'sys:fx:USD' ? { ...posting, currency: 'ARS' } : posting,
    ),
  };
  has(problems(wrongBridgeCurrency), 'bridge posting currency ARS does not match FX account currency USD');
});

test('conversion re-derivation is verified against stored amounts', () => {
  const exchangeTx = validExchange();
  const tampered: Transaction = {
    ...exchangeTx,
    postings: exchangeTx.postings.map((posting) =>
      posting.accountId === 'sys:fx:USD' ? { ...posting, amount: -8476n } : posting.accountId === 'bank-usd' ? { ...posting, amount: 8476n } : posting,
    ),
  };
  has(problems(tampered), 'does not re-derive');

  const wrongRatio: Transaction = {
    ...exchangeTx,
    conversion: { ...exchangeTx.conversion!, rateRatio: { num: 1n, den: 1n } },
  };
  has(problems(wrongRatio), 'does not re-derive');
  has(problems(wrongRatio), 'inconsistent with rateText');
});

test('conversion metadata is validated', () => {
  const exchangeTx = validExchange();
  const base = exchangeTx.conversion!;

  const badRateText: Transaction = { ...exchangeTx, conversion: { ...base, rateText: 'abc' } };
  has(problems(badRateText), 'rateText is not a valid rate');

  const sameCurrency: Transaction = { ...exchangeTx, conversion: { ...base, toCurrency: 'ARS' } };
  has(problems(sameCurrency), 'fromCurrency and toCurrency must differ');

  const unknownCurrency: Transaction = { ...exchangeTx, conversion: { ...base, toCurrency: 'XXX' } };
  has(problems(unknownCurrency), 'unknown toCurrency "XXX"');

  const badDirection: Transaction = { ...exchangeTx, conversion: { ...base, quoteDirection: 'sideways' as never } };
  has(problems(badDirection), 'quoteDirection must be srcPerDest|destPerSrc');

  const badSource: Transaction = { ...exchangeTx, conversion: { ...base, source: 'web' as never } };
  has(problems(badSource), 'source must be manual|institution|file');

  const badMode: Transaction = { ...exchangeTx, conversion: { ...base, roundingMode: 'ceil' as never } };
  has(problems(badMode), 'unknown roundingMode ceil');

  const badRateAt: Transaction = { ...exchangeTx, conversion: { ...base, rateAt: 'yesterday' } };
  has(problems(badRateAt), 'rateAt must be a valid date or ISO datetime');

  const badRatio: Transaction = { ...exchangeTx, conversion: { ...base, rateRatio: { num: 0n, den: 1n } } };
  has(problems(badRatio), 'rateRatio must be a positive integer ratio');

  const equivalentText: Transaction = { ...exchangeTx, conversion: { ...base, rateText: '1180.00' } };
  assert.deepEqual(problems(equivalentText), [], 'rateText 1180.00 reduces to the same 1180/1 ratio');
});

test('posting amount rules: zero, int64, kind, cardinality', () => {
  const tx = validExpense();

  const zero: Transaction = { ...tx, postings: [{ ...tx.postings[0]!, amount: 0n }, tx.postings[1]!] };
  has(problems(zero), 'amount must be non-zero');

  const overflow: Transaction = { ...tx, postings: [{ ...tx.postings[0]!, amount: 2n ** 63n }, tx.postings[1]!] };
  has(problems(overflow), 'outside the int64 range');

  const badKind: Transaction = { ...tx, postings: [{ ...tx.postings[0]!, kind: 'ghost' as never }, tx.postings[1]!] };
  has(problems(badKind), 'kind must be normal|bridge');

  const single: Transaction = { ...tx, postings: [tx.postings[0]!] };
  has(problems(single), 'at least 2 postings');

  const notArray = { ...tx, postings: 'nope' as never };
  has(problems(notArray), 'postings must be an array');
});

test('id, date and memo rules', () => {
  const tx = validExpense();
  has(problems({ ...tx, id: '' }), 'id must be a non-empty string');
  has(problems({ ...tx, id: 'x'.repeat(129) }), 'at most 128 characters');
  has(problems({ ...tx, date: '2026-02-30' }), 'valid YYYY-MM-DD');
  has(problems({ ...tx, date: '04/10/2026' }), 'valid YYYY-MM-DD');
  has(problems({ ...tx, memo: 42 as never }), 'memo must be a string');
});

test('assertTransaction throws one aggregated DomainError', () => {
  const tx = validExpense();
  const broken: Transaction = { ...tx, date: 'nope', postings: [{ ...tx.postings[0]!, amount: 1n }, tx.postings[1]!] };
  try {
    assertTransaction(broken, refs);
    assert.fail('expected throw');
  } catch (error) {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, 'INVALID_TRANSACTION');
    assert.ok(error.message.includes('valid YYYY-MM-DD'));
    assert.ok(error.message.includes('does not balance'));
  }
});
