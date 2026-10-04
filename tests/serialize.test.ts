import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { DomainError } from '../src/domain/errors.ts';
import { exchange } from '../src/domain/operations.ts';
import { fromWire, stableStringify, toWire, type WireTransaction } from '../src/domain/serialize.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';

function sampleExchange() {
  return exchange({
    refs,
    id: 'wire-1',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
    fee: { amount: money(50000n, 'ARS'), category: cat('fees') },
    memo: 'cambio del día',
  });
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

test('roundtrip: domain -> wire -> JSON -> domain is exact', () => {
  const tx = sampleExchange();
  const wire = toWire(tx);
  const json = JSON.parse(JSON.stringify(wire));
  const restored = fromWire(json, refs);
  assert.deepEqual(restored, tx);
  assert.equal(typeof wire.postings[0]!.amount, 'string');
  assert.equal(wire.postings[0]!.amount, '-10000000');
  assert.equal(wire.conversion?.rateRatio.num, '1180');
  assert.equal(wire.conversion?.rateRatio.den, '1');
});

test('roundtrip: big amounts stay exact outside safe integer range', () => {
  const tx = exchange({
    refs,
    id: 'wire-big',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(9000000000000000n, 'ARS'),
    rate: RATE_1180,
  });
  const restored = fromWire(JSON.parse(JSON.stringify(toWire(tx))), refs);
  assert.deepEqual(restored, tx);
  assert.equal(restored.postings[0]!.amount, -9000000000000000n);
});

test('wire rejects non-canonical amount strings', () => {
  const wire: WireTransaction = JSON.parse(JSON.stringify(toWire(sampleExchange())));
  throwsCode(() => fromWire({ ...wire, id: 7 }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire(null, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire('tx', refs), 'WIRE_INVALID');
  throwsCode(() => fromWire([wire], refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, extra: 1 }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, postings: 'nope' }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, postings: [] }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, memo: null }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, date: undefined }, refs), 'WIRE_INVALID');

  const badAmount = { ...wire, postings: wire.postings.map((p, i) => (i === 0 ? { ...p, amount: '007' } : p)) };
  throwsCode(() => fromWire(badAmount, refs), 'WIRE_INVALID');

  const floatAmount = { ...wire, postings: wire.postings.map((p, i) => (i === 0 ? { ...p, amount: '1.5' } : p)) };
  throwsCode(() => fromWire(floatAmount, refs), 'WIRE_INVALID');

  const spacedAmount = { ...wire, postings: wire.postings.map((p, i) => (i === 0 ? { ...p, amount: ' 100' } : p)) };
  throwsCode(() => fromWire(spacedAmount, refs), 'WIRE_INVALID');

  const zeroAmount = { ...wire, postings: wire.postings.map((p, i) => (i === 0 ? { ...p, amount: '0' } : p)) };
  throwsCode(() => fromWire(zeroAmount, refs), 'WIRE_INVALID');

  const overflow = { ...wire, postings: wire.postings.map((p, i) => (i === 0 ? { ...p, amount: '99999999999999999999999' } : p)) };
  throwsCode(() => fromWire(overflow, refs), 'AMOUNT_OUT_OF_INT64_RANGE');
});

test('wire rejects malformed structure and enums', () => {
  const wire = JSON.parse(JSON.stringify(toWire(sampleExchange())));
  throwsCode(() => fromWire({ ...wire, postings: [{ ...wire.postings[0], kind: 'ghost' }] }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, postings: [{ ...wire.postings[0], amount: 123 }] }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, postings: [{ ...wire.postings[0], categoryId: 5 }] }, refs), 'WIRE_INVALID');
  throwsCode(() => fromWire({ ...wire, id: undefined }, refs), 'WIRE_INVALID');

  const badDirection = { ...wire, conversion: { ...wire.conversion, quoteDirection: 'up' } };
  throwsCode(() => fromWire(badDirection, refs), 'WIRE_INVALID');

  const badSource = { ...wire, conversion: { ...wire.conversion, source: 'magic' } };
  throwsCode(() => fromWire(badSource, refs), 'WIRE_INVALID');

  const badMode = { ...wire, conversion: { ...wire.conversion, roundingMode: 'ceil' } };
  throwsCode(() => fromWire(badMode, refs), 'WIRE_INVALID');

  const zeroRatio = { ...wire, conversion: { ...wire.conversion, rateRatio: { num: '0', den: '1' } } };
  throwsCode(() => fromWire(zeroRatio, refs), 'WIRE_INVALID');

  const negativeRatio = { ...wire, conversion: { ...wire.conversion, rateRatio: { num: '-5', den: '1' } } };
  throwsCode(() => fromWire(negativeRatio, refs), 'WIRE_INVALID');

  const paddedRatio = { ...wire, conversion: { ...wire.conversion, rateRatio: { num: '01180', den: '1' } } };
  throwsCode(() => fromWire(paddedRatio, refs), 'WIRE_INVALID');
});

test('wire passes structure but the domain validator still rejects bad semantics', () => {
  const wire = JSON.parse(JSON.stringify(toWire(sampleExchange()))) as WireTransaction;

  const unbalanced = {
    ...wire,
    postings: wire.postings.map((posting, index) => (index === 0 ? { ...posting, amount: '-1' } : posting)),
  };
  throwsCode(() => fromWire(unbalanced, refs), 'INVALID_TRANSACTION');

  const unknownAccount = {
    ...wire,
    postings: wire.postings.map((posting, index) => (index === 0 ? { ...posting, accountId: 'ghost' } : posting)),
  };
  throwsCode(() => fromWire(unknownAccount, refs), 'INVALID_TRANSACTION');

  const noConversion: WireTransaction = { ...wire, conversion: undefined };
  const stripped = { ...noConversion } as Record<string, unknown>;
  delete stripped.conversion;
  throwsCode(() => fromWire(stripped, refs), 'INVALID_TRANSACTION');
});

test('stableStringify: canonical key order, arrays kept, undefined dropped', () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(stableStringify({ z: { y: 1, x: 2 } }), '{"z":{"x":2,"y":1}}');
  assert.equal(stableStringify([1, 'two', null]), '[1,"two",null]');
  assert.equal(stableStringify({ a: undefined, b: 1 }), '{"b":1}');
  const tx = sampleExchange();
  const wireForm = toWire(tx);
  const first = stableStringify(wireForm);
  const shuffled = stableStringify({
    memo: wireForm.memo,
    postings: wireForm.postings,
    id: wireForm.id,
    date: wireForm.date,
    conversion: wireForm.conversion,
  });
  assert.equal(first, shuffled, 'key insertion order does not change the canonical form');
  assert.equal(stableStringify(stableStringify(toWire(tx))), JSON.stringify(first));
});
