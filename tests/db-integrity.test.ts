import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from '../src/persistence/db.ts';
import { loadTransaction, saveTransaction } from '../src/persistence/repository.ts';
import { money } from '../src/domain/money.ts';
import { exchange } from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';

function corruptDb(mutator: (db: Db) => void): Db {
  const db = openTestDb();
  seedStandardRefs(db);
  const tx = exchange({
    refs,
    id: 'corr',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
    fee: { amount: money(50000n, 'ARS'), category: cat('fees') },
  });
  saveTransaction(db, tx);
  mutator(db);
  return db;
}

function expectLoadThrows(db: Db, code: string, messagePart: string): void {
  try {
    throwsCode(() => loadTransaction(db, 'corr'), code, messagePart);
  } finally {
    db.close();
  }
}

test('corrupt amount strings fail closed on read', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE postings SET amount = 'abc' WHERE account_id = 'bank-ars'")),
    'CORRUPT_ROW',
    'not a canonical integer string',
  );
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE postings SET amount = '007' WHERE account_id = 'bank-ars'")),
    'CORRUPT_ROW',
    'not a canonical integer string',
  );
});

test('missing posting row breaks the balance and fails closed', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("DELETE FROM postings WHERE account_id = 'sys:fx:USD'")),
    'INVALID_TRANSACTION',
    'does not balance',
  );
});

test('flipped account currency fails closed', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE accounts SET currency = 'USD' WHERE id = 'bank-ars'")),
    'INVALID_TRANSACTION',
    'posting currency',
  );
});

test('tampered conversion ratio fails re-derivation', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE conversions SET rate_num = '1' WHERE transaction_id = 'corr'")),
    'INVALID_TRANSACTION',
    'does not re-derive',
  );
});

test('deleted conversion row leaves bridges without a record', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("DELETE FROM conversions WHERE transaction_id = 'corr'")),
    'INVALID_TRANSACTION',
    'without a Conversion record',
  );
});

test('flipped posting kind fails closed', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE postings SET kind = 'normal' WHERE account_id = 'sys:fx:ARS'")),
    'INVALID_TRANSACTION',
    'accepts only kind "bridge"',
  );
});

test('category foreign key blocks dangling references at write time', () => {
  const db = corruptDb(() => {});
  try {
    assert.throws(() => {
      db.exec("UPDATE postings SET category_id = 'ghost' WHERE account_id = 'sys:expense'");
    }, /FOREIGN KEY/);
    assert.deepEqual(loadTransaction(db, 'corr').id, 'corr');
  } finally {
    db.close();
  }
});

test('unknown category fails closed when constraints are bypassed', () => {
  const db = corruptDb((inner) => {
    inner.exec('PRAGMA foreign_keys = OFF');
    inner.exec("UPDATE postings SET category_id = 'ghost' WHERE account_id = 'sys:expense'");
    inner.exec('PRAGMA foreign_keys = ON');
  });
  try {
    throwsCode(() => loadTransaction(db, 'corr'), 'INVALID_TRANSACTION', 'unknown category');
  } finally {
    db.close();
  }
});

test('malformed date fails closed; non-canonical numerics fail closed', () => {
  expectLoadThrows(
    corruptDb((db) => db.exec("UPDATE transactions SET date = 'not-a-date' WHERE id = 'corr'")),
    'INVALID_TRANSACTION',
    'valid YYYY-MM-DD',
  );
  expectLoadThrows(
    corruptDb((db) => db.exec('UPDATE postings SET amount = 5.5 WHERE account_id = \'bank-ars\'')),
    'CORRUPT_ROW',
    'not a canonical integer string',
  );
});

test('integer memo normalizes through TEXT affinity and stays valid', () => {
  const db = corruptDb((inner) => {
    inner.exec('UPDATE transactions SET memo = 42 WHERE id = \'corr\'');
  });
  try {
    assert.equal(loadTransaction(db, 'corr').memo, '42');
  } finally {
    db.close();
  }
});

test('account type enum is enforced by the database itself', () => {
  const db = corruptDb(() => {});
  try {
    assert.throws(() => {
      db.exec("UPDATE accounts SET type = 'INCOME' WHERE id = 'bank-ars'");
    });
    assert.deepEqual(loadTransaction(db, 'corr').id, 'corr');
  } finally {
    db.close();
  }
});
