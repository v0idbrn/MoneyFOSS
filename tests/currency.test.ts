import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCurrency, isKnownCurrency, listCurrencies } from '../src/domain/currency.ts';
import { DomainError } from '../src/domain/errors.ts';

test('embedded snapshot exponents', () => {
  assert.equal(getCurrency('ARS').exponent, 2);
  assert.equal(getCurrency('USD').exponent, 2);
  assert.equal(getCurrency('EUR').exponent, 2);
  assert.equal(getCurrency('CLP').exponent, 0);
  assert.equal(getCurrency('JPY').exponent, 0);
  assert.equal(getCurrency('KWD').exponent, 3);
});

test('snapshot contents', () => {
  assert.equal(listCurrencies().length, 6);
  assert.ok(isKnownCurrency('ARS'));
  assert.ok(!isKnownCurrency('XXX'));
  assert.ok(!isKnownCurrency('ars'), 'codes are case-sensitive');
  assert.ok(!isKnownCurrency('__proto__'));
  assert.ok(!isKnownCurrency('constructor'));
  assert.throws(() => getCurrency('XXX'), (error: unknown) => error instanceof DomainError && error.code === 'UNKNOWN_CURRENCY');
});
