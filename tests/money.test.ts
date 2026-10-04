import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ROUNDING,
  INT64_MAX,
  INT64_MIN,
  addMoney,
  assertInt64,
  convertMinor,
  deriveMinorUnits,
  formatMoney,
  money,
  parseMoney,
  parseRatio,
  reduceRatio,
  subMoney,
} from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';

function throwsCode(fn: () => void, code: string): void {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof DomainError, `expected DomainError, got ${String(error)}`);
    assert.equal(error.code, code, `expected code ${code}, got ${error.code}: ${error.message}`);
    return;
  }
  assert.fail(`expected DomainError ${code} but nothing was thrown`);
}

test('parseMoney: strict plain decimals per currency', () => {
  assert.equal(parseMoney('10.00', 'ARS').amount, 1000n);
  assert.equal(parseMoney('1234.5', 'ARS').amount, 123450n);
  assert.equal(parseMoney('-0.05', 'ARS').amount, -5n);
  assert.equal(parseMoney('0', 'ARS').amount, 0n);
  assert.equal(parseMoney('1000', 'CLP').amount, 1000n);
  assert.equal(parseMoney('500', 'JPY').amount, 500n);
  assert.equal(parseMoney('1.234', 'KWD').amount, 1234n);
  assert.equal(parseMoney('1.2', 'KWD').amount, 1200n);
});

test('parseMoney: rejects ambiguous or excess input at the trust boundary', () => {
  throwsCode(() => parseMoney('1,000.00', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('1.00.0', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('1e3', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney(' 10.00', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('10.00 ', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('.5', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('5.', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('', 'ARS'), 'INVALID_MONEY_FORMAT');
  throwsCode(() => parseMoney('1000.5', 'CLP'), 'EXCESS_DECIMALS');
  throwsCode(() => parseMoney('1.000', 'USD'), 'EXCESS_DECIMALS');
  throwsCode(() => parseMoney('99999999999999999999.99', 'ARS'), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => parseMoney('10.00', 'XXX'), 'UNKNOWN_CURRENCY');
});

test('formatMoney: derived display, never rounded', () => {
  assert.equal(formatMoney(money(1000n, 'ARS')), '10.00');
  assert.equal(formatMoney(money(-5n, 'ARS')), '-0.05');
  assert.equal(formatMoney(money(0n, 'ARS')), '0.00');
  assert.equal(formatMoney(money(0n, 'CLP')), '0');
  assert.equal(formatMoney(money(5n, 'CLP')), '5');
  assert.equal(formatMoney(money(1234n, 'KWD')), '1.234');
  assert.equal(formatMoney(money(999999999999999999n, 'ARS')), '9999999999999999.99');
});

test('parseMoney/formatMoney roundtrip', () => {
  const samples: Array<[string, string]> = [
    ['ARS', '1234567890.99'],
    ['ARS', '-0.01'],
    ['ARS', '0.00'],
    ['USD', '0.10'],
    ['CLP', '1234567'],
    ['JPY', '-500'],
    ['KWD', '1.234'],
    ['EUR', '2.50'],
  ];
  for (const [currency, text] of samples) {
    assert.equal(formatMoney(parseMoney(text, currency)), text, `${currency} ${text}`);
  }
});

test('int64 range guards', () => {
  assert.equal(money(INT64_MAX, 'ARS').amount, INT64_MAX);
  assert.equal(money(INT64_MIN, 'ARS').amount, INT64_MIN);
  throwsCode(() => money(INT64_MAX + 1n, 'ARS'), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => money(INT64_MIN - 1n, 'ARS'), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => assertInt64(INT64_MAX + 1n, 'sum'), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => money(1n, 'XXX'), 'UNKNOWN_CURRENCY');
});

test('addMoney/subMoney: same currency only', () => {
  assert.equal(addMoney(money(100n, 'ARS'), money(250n, 'ARS')).amount, 350n);
  assert.equal(subMoney(money(100n, 'ARS'), money(250n, 'ARS')).amount, -150n);
  throwsCode(() => addMoney(money(1n, 'ARS'), money(1n, 'USD')), 'CURRENCY_MISMATCH');
  throwsCode(() => subMoney(money(1n, 'ARS'), money(1n, 'USD')), 'CURRENCY_MISMATCH');
});

test('deriveMinorUnits: exact division, ties, signs, truncate', () => {
  assert.equal(deriveMinorUnits(10n, 2n), 5n);
  assert.equal(deriveMinorUnits(-10n, 2n), -5n);
  assert.equal(deriveMinorUnits(1n, 2n), 1n, '0.5 half-away rounds away from zero');
  assert.equal(deriveMinorUnits(-1n, 2n), -1n, '-0.5 half-away rounds away from zero');
  assert.equal(deriveMinorUnits(3n, 2n), 2n, '1.5 half-away rounds up');
  assert.equal(deriveMinorUnits(-3n, 2n), -2n, '-1.5 half-away rounds down');
  assert.equal(deriveMinorUnits(5n, 2n, 'half-even'), 2n, '2.5 half-even goes to even');
  assert.equal(deriveMinorUnits(7n, 2n, 'half-even'), 4n, '3.5 half-even goes to even');
  assert.equal(deriveMinorUnits(-5n, 2n, 'half-even'), -2n, '-2.5 half-even goes to even');
  assert.equal(deriveMinorUnits(3n, 2n, 'truncate'), 1n);
  assert.equal(deriveMinorUnits(-3n, 2n, 'truncate'), -1n);
  assert.equal(deriveMinorUnits(0n, 7n), 0n);
  assert.equal(deriveMinorUnits(5n, -2n), -3n, 'negative denominator still rounds half away from zero');
  throwsCode(() => deriveMinorUnits(1n, 0n), 'DIVISION_BY_ZERO');
  throwsCode(() => deriveMinorUnits(1n, 2n, 'bankers-ish' as never), 'UNKNOWN_ROUNDING_MODE');
  assert.equal(DEFAULT_ROUNDING, 'half-away-from-zero');
});

test('convertMinor: exponents and rounding flow through conversion math', () => {
  assert.equal(convertMinor(1_000_000n, 2, 2, 1n, 1180n, 'half-away-from-zero'), 847n);
  assert.equal(convertMinor(10_000_000n, 2, 2, 1n, 1180n, 'half-away-from-zero'), 8475n);
  assert.equal(convertMinor(9_950_000n, 2, 2, 1n, 1180n, 'half-away-from-zero'), 8432n);
  assert.equal(convertMinor(1_000_000n, 2, 0, 1n, 1n, 'half-away-from-zero'), 10000n, 'ARS->CLP at 1:1');
  assert.equal(convertMinor(1000n, 3, 2, 2n, 1n, 'half-away-from-zero'), 200n, 'KWD->USD at 2:1');
  throwsCode(() => convertMinor(1n, 2, 2, 0n, 1n, 'half-away-from-zero'), 'INVALID_RATE_RATIO');
});

test('parseRatio: exact reduced ratios from user text', () => {
  assert.deepEqual(parseRatio('1180'), { num: 1180n, den: 1n });
  assert.deepEqual(parseRatio('1180.50'), { num: 2361n, den: 2n });
  assert.deepEqual(parseRatio('0.5'), { num: 1n, den: 2n });
  assert.deepEqual(reduceRatio({ num: 6n, den: 4n }), { num: 3n, den: 2n });
  throwsCode(() => parseRatio('0'), 'RATE_MUST_BE_POSITIVE');
  throwsCode(() => parseRatio('0.000'), 'RATE_MUST_BE_POSITIVE');
  throwsCode(() => parseRatio('-5'), 'INVALID_RATE_FORMAT');
  throwsCode(() => parseRatio('5.'), 'INVALID_RATE_FORMAT');
  throwsCode(() => parseRatio('.5'), 'INVALID_RATE_FORMAT');
  throwsCode(() => parseRatio('1/2'), 'INVALID_RATE_FORMAT');
  throwsCode(() => parseRatio('abc'), 'INVALID_RATE_FORMAT');
  throwsCode(() => parseRatio('1'.repeat(33)), 'RATE_TEXT_TOO_LONG');
});
