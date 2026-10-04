import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, money, parseMoney } from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';
import { cardPayment, cardPurchase, exchange, expense, income, transfer } from '../src/domain/operations.ts';
import { findTransactionProblems } from '../src/domain/validate.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomAmount(rand: () => number): bigint {
  return BigInt(Math.floor(rand() * 1_000_000_000_000) + 10_000);
}

function assertZeroPerCurrency(tx: Transaction): void {
  const sums = new Map<string, bigint>();
  for (const posting of tx.postings) {
    sums.set(posting.currency, (sums.get(posting.currency) ?? 0n) + posting.amount);
  }
  assert.ok(sums.size > 0);
  for (const [currency, sum] of sums) {
    assert.equal(sum, 0n, `${tx.id}: independent per-currency sum for ${currency} is ${sum}`);
  }
}

test('property: 500 random valid operations all satisfy the balance invariant', () => {
  const rand = mulberry32(20261004);
  const rates = ['1180', '999.5', '1', '2.5', '0.5'];
  let built = 0;
  let conversions = 0;

  for (let i = 0; i < 500; i += 1) {
    const id = `prop-${i}`;
    const pick = Math.floor(rand() * 8);
    let tx: Transaction;
    if (pick === 0) {
      tx = expense({ refs, id, date: TODAY, account: acct('bank-ars'), amount: money(randomAmount(rand), 'ARS'), category: cat('food') });
    } else if (pick === 1) {
      tx = expense({ refs, id, date: TODAY, account: acct('bank-usd'), amount: money(randomAmount(rand), 'USD'), category: cat('food') });
    } else if (pick === 2) {
      tx = income({ refs, id, date: TODAY, account: acct('bank-ars'), amount: money(randomAmount(rand), 'ARS'), category: cat('salary') });
    } else if (pick === 3) {
      tx = transfer({ refs, id, date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(randomAmount(rand), 'ARS') });
    } else if (pick === 4) {
      tx = cardPurchase({ refs, id, date: TODAY, account: acct('card-ars'), amount: money(randomAmount(rand), 'ARS'), category: cat('food') });
    } else if (pick === 5) {
      tx = cardPayment({ refs, id, date: TODAY, from: acct('bank-ars'), to: acct('card-ars'), amount: money(randomAmount(rand), 'ARS') });
    } else if (pick === 6) {
      const rateText = rates[Math.floor(rand() * rates.length)]!;
      tx = exchange({
        refs,
        id,
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(randomAmount(rand), 'ARS'),
        rate: { text: rateText, quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
      });
      conversions += 1;
    } else {
      const feeInUsd = rand() < 0.5;
      const amount = randomAmount(rand);
      const fee =
        feeInUsd
          ? { amount: money(1n + BigInt(Math.floor(rand() * 1000)), 'USD'), category: cat('fees') }
          : { amount: money(1n + amount / 10n, 'ARS'), category: cat('fees') };
      try {
        tx = exchange({
          refs,
          id,
          date: TODAY,
          from: acct('bank-ars'),
          to: acct('bank-usd'),
          amount: money(amount, 'ARS'),
          rate: { text: '1180', quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
          fee,
        });
        conversions += 1;
      } catch (error) {
        assert.ok(error instanceof DomainError);
        assert.equal(error.code, 'FEE_EXCEEDS_AMOUNT');
        continue;
      }
    }
    assertZeroPerCurrency(tx);
    assert.deepEqual(findTransactionProblems(tx, refs), [], `${tx.id} must pass the validator`);
    built += 1;
  }

  assert.ok(built >= 450, `expected most generations to succeed, built ${built}`);
  assert.ok(conversions >= 50, `expected meaningful conversion coverage, got ${conversions}`);
});

test('property: perturbing any posting by 1 minor unit is always detected', () => {
  const rand = mulberry32(7);
  for (let i = 0; i < 100; i += 1) {
    const tx = expense({
      refs,
      id: `perturb-${i}`,
      date: TODAY,
      account: acct('bank-ars'),
      amount: money(randomAmount(rand), 'ARS'),
      category: cat('food'),
    });
    const original = tx.postings[0]!;
    const broken: Transaction = {
      ...tx,
      postings: [{ ...original, amount: original.amount + 1n }, ...tx.postings.slice(1)],
    };
    const problems = findTransactionProblems(broken, refs);
    assert.ok(
      problems.some((problem) => problem.includes('does not balance')),
      `perturbation of ${tx.id} must be caught`,
    );
  }
});

test('property: random strict decimal strings survive parse/format roundtrip', () => {
  const rand = mulberry32(99);
  const currencies = ['ARS', 'USD', 'CLP', 'KWD'] as const;
  for (let i = 0; i < 300; i += 1) {
    const currency = currencies[Math.floor(rand() * currencies.length)]!;
    const intDigits = 1 + Math.floor(rand() * 15);
    let integer = '';
    for (let d = 0; d < intDigits; d += 1) {
      integer += String(Math.floor(rand() * 10));
    }
    if (integer.length > 1 && integer.startsWith('0')) {
      integer = integer.replace(/^0+/, '') || '0';
    }
    const exponent = currency === 'CLP' ? 0 : currency === 'KWD' ? 3 : 2;
    let text = integer;
    if (exponent > 0 && rand() < 0.7) {
      let fraction = '';
      const fractionDigits = 1 + Math.floor(rand() * exponent);
      for (let d = 0; d < fractionDigits; d += 1) {
        fraction += String(Math.floor(rand() * 10));
      }
      text = `${integer}.${fraction}`;
    }
    const parsed = parseMoney(text, currency);
    const formatted = formatMoney(parsed);
    assert.deepEqual(parseMoney(formatted, currency), parsed, `${currency} ${text} -> ${formatted}`);
  }
});
