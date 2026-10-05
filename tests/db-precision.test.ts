import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INT64_MAX, INT64_MIN } from '../src/domain/money.ts';
import { buildTransaction } from '../src/domain/operations.ts';
import { loadTransaction, saveTransaction } from '../src/persistence/repository.ts';
import { TODAY, refs } from './fixtures.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';

test('int64 edges, >2^53 values and negatives roundtrip exactly', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const amounts = [INT64_MAX, INT64_MIN + 1n, 9007199254740993n, -9007199254740993n, -123456789n, 1n];
    for (const amount of amounts) {
      const tx = buildTransaction({
        refs,
        id: `prec-${amount}`,
        date: TODAY,
        postings: [
          { accountId: 'bank-ars', currency: 'ARS', amount, kind: 'normal' },
          { accountId: 'opening-ars', currency: 'ARS', amount: -amount, kind: 'normal' },
        ],
      });
      saveTransaction(db, tx);
      assert.deepEqual(loadTransaction(db, tx.id), tx);
    }
    const stored = db
      .query('SELECT amount FROM postings WHERE amount IN (?, ?)', ['9223372036854775807', '9007199254740993'])
      .map((row) => row.amount);
    assert.deepEqual(stored.sort(), [
      '9007199254740993',
      '9007199254740993',
      '9223372036854775807',
      '9223372036854775807',
    ]);
    for (const row of db.query('SELECT amount FROM postings')) {
      assert.equal(typeof row.amount, 'string', 'amounts are stored as TEXT, never REAL');
    }
  } finally {
    db.close();
  }
});

test('zero-amount postings never reach the database', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    throwsCode(
      () =>
        saveTransaction(db, {
          id: 'zero',
          date: TODAY,
          postings: [
            { accountId: 'bank-ars', currency: 'ARS', amount: 0n, kind: 'normal' },
            { accountId: 'bank-ars', currency: 'ARS', amount: 0n, kind: 'normal' },
          ],
        }),
      'INVALID_TRANSACTION',
      'non-zero',
    );
    assert.equal(db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c, 0);
  } finally {
    db.close();
  }
});

test('out-of-range wire-scale values fail at the persistence boundary', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    throwsCode(
      () =>
        saveTransaction(db, {
          id: 'huge',
          date: TODAY,
          postings: [
            { accountId: 'bank-ars', currency: 'ARS', amount: 2n ** 63n, kind: 'normal' },
            { accountId: 'opening-ars', currency: 'ARS', amount: -(2n ** 63n), kind: 'normal' },
          ],
        }),
      'INVALID_TRANSACTION',
      'int64',
    );
    assert.equal(db.query('SELECT COUNT(*) AS c FROM transactions')[0]?.c, 0);
  } finally {
    db.close();
  }
});
