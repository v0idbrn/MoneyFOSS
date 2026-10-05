import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';
import { exchange, expense } from '../src/domain/operations.ts';
import { conversionEffectiveRatio, deriveConversionDest } from '../src/domain/types.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

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

function bridgeAmount(tx: Transaction, accountId: string): bigint {
  const posting = tx.postings.find((p) => p.accountId === accountId);
  assert.ok(posting, `missing bridge ${accountId}`);
  return posting.amount;
}

test('quoteDirection defines how the stored ratio is applied', () => {
  const base = {
    fromCurrency: 'ARS',
    toCurrency: 'USD',
    rateText: '1180',
    rateRatio: { num: 1180n, den: 1n },
    rateAt: '2026-10-04T12:00:00Z',
    source: 'manual' as const,
    roundingMode: 'half-away-from-zero' as const,
  };
  assert.deepEqual(conversionEffectiveRatio({ ...base, quoteDirection: 'srcPerDest' }), { num: 1n, den: 1180n });
  assert.deepEqual(conversionEffectiveRatio({ ...base, quoteDirection: 'destPerSrc' }), { num: 1180n, den: 1n });
  assert.equal(deriveConversionDest({ ...base, quoteDirection: 'srcPerDest' }, 10_000_000n), 8475n);
  assert.equal(deriveConversionDest({ ...base, quoteDirection: 'destPerSrc' }, 10_000_000n), 11_800_000_000n);
});

test('destPerSrc quote: 0,00085 USD por ARS', () => {
  const tx = exchange({
    refs,
    id: 'fx-direct',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(1000000n, 'ARS'),
    rate: { text: '0.00085', quoteDirection: 'destPerSrc', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
  });
  assert.equal(bridgeAmount(tx, 'sys:fx:USD'), -850n);
  assert.deepEqual(tx.conversion?.rateRatio, { num: 17n, den: 20000n }, 'ratios are stored reduced');
});

test('srcPerDest quote with decimal text: 0,5 ARS por USD doubles the source', () => {
  const tx = exchange({
    refs,
    id: 'fx-half',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(1000000n, 'ARS'),
    rate: { text: '0.5', quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'institution' },
  });
  assert.equal(bridgeAmount(tx, 'sys:fx:USD'), -2000000n);
});

test('rounding mode is stored per conversion and changes the stored integer', () => {
  const rate = { text: '0.5', quoteDirection: 'destPerSrc' as const, rateAt: '2026-10-04T12:00:00Z', source: 'manual' as const };
  const halfAway = exchange({
    refs,
    id: 'rnd-away',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(1000001n, 'ARS'),
    rate: { ...rate, roundingMode: 'half-away-from-zero' },
  });
  const halfEven = exchange({
    refs,
    id: 'rnd-even',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(1000001n, 'ARS'),
    rate: { ...rate, roundingMode: 'half-even' },
  });
  assert.equal(bridgeAmount(halfAway, 'sys:fx:USD'), -500001n, '500000.5 -> 500001 half-away');
  assert.equal(bridgeAmount(halfEven, 'sys:fx:USD'), -500000n, '500000.5 -> 500000 half-even');
  assert.equal(halfAway.conversion?.roundingMode, 'half-away-from-zero');
  assert.equal(halfEven.conversion?.roundingMode, 'half-even');
});

test('rate source is recorded verbatim', () => {
  const tx = exchange({
    refs,
    id: 'src-inst',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: { ...RATE_1180, source: 'file' },
  });
  assert.equal(tx.conversion?.source, 'file');
  assert.equal(tx.conversion?.rateText, '1180');
});

test('cross-currency expense re-derives identically to the exchange path', () => {
  const paid = expense({
    refs,
    id: 'x1',
    date: TODAY,
    account: acct('bank-usd'),
    amount: money(1000000n, 'ARS'),
    category: cat('food'),
    rate: RATE_1180,
  });
  assert.equal(bridgeAmount(paid, 'sys:fx:USD'), 847n);
  assert.equal(paid.conversion?.fromCurrency, 'ARS');
  assert.equal(paid.conversion?.toCurrency, 'USD');
});

test('audit conversion: exact 1:1 rate stores identical integers', () => {
  const tx = exchange({
    refs,
    id: 'fx-exact',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(1000000n, 'ARS'),
    rate: { text: '1', quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
  });
  assert.equal(bridgeAmount(tx, 'sys:fx:USD'), -1000000n);
});

test('audit conversion: reverse USD->ARS quotes destPerSrc', () => {
  const tx = exchange({
    refs,
    id: 'fx-reverse',
    date: TODAY,
    from: acct('bank-usd'),
    to: acct('bank-ars'),
    amount: money(8475n, 'USD'),
    rate: { text: '1180', quoteDirection: 'destPerSrc', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
  });
  assert.equal(bridgeAmount(tx, 'sys:fx:ARS'), -10000500n);
  assert.equal(bridgeAmount(tx, 'sys:fx:USD'), 8475n);
});

test('audit conversion: zero and negative rates are rejected, never stored', () => {
  for (const text of ['0', '0.00', '00.000']) {
    throwsCode(
      () =>
        exchange({
          refs,
          id: `fx-zero-${text}`,
          date: TODAY,
          from: acct('bank-ars'),
          to: acct('bank-usd'),
          amount: money(1000000n, 'ARS'),
          rate: { text, quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
        }),
      'RATE_MUST_BE_POSITIVE',
    );
  }
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'fx-negative',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(1000000n, 'ARS'),
        rate: { text: '-5', quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
      }),
    'INVALID_RATE_FORMAT',
  );
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'fx-long',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(1000000n, 'ARS'),
        rate: { text: '1'.repeat(33), quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
      }),
    'RATE_TEXT_TOO_LONG',
  );
});

test('audit conversion: extreme rate overflow fails closed as INVALID_TRANSACTION', () => {
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'fx-huge',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(1000000000000n, 'ARS'),
        rate: { text: '9'.repeat(32), quoteDirection: 'destPerSrc', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
      }),
    'INVALID_TRANSACTION',
  );
});

test('audit conversion: extreme rate that rounds to zero is degenerate, not silent', () => {
  throwsCode(
    () =>
      exchange({
        refs,
        id: 'fx-tiny',
        date: TODAY,
        from: acct('bank-ars'),
        to: acct('bank-usd'),
        amount: money(10000000n, 'ARS'),
        rate: { text: '9'.repeat(32), quoteDirection: 'srcPerDest', rateAt: '2026-10-04T12:00:00Z', source: 'manual' },
      }),
    'DEGENERATE_CONVERSION',
  );
});

test('audit conversion: identical inputs are byte-identical outputs', () => {
  const input = {
    refs,
    id: 'fx-det',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
  };
  assert.deepEqual(exchange(input), exchange({ ...input, id: 'fx-det' }));
});
