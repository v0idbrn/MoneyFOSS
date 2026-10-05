import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openNodeDb } from '../src/persistence/drivers/node-sqlite.ts';
import { getSchemaVersion, migrate } from '../src/persistence/migrate.ts';
import { loadTransaction, saveTransaction } from '../src/persistence/repository.ts';
import { money } from '../src/domain/money.ts';
import { expense } from '../src/domain/operations.ts';
import { TODAY, acct, cat, refs } from './fixtures.ts';
import { openTestDb, throwsCode } from './db-fixtures.ts';

test('migrate is idempotent', () => {
  const db = openNodeDb(':memory:');
  try {
    assert.equal(migrate(db), 1);
    assert.equal(migrate(db), 1);
    assert.equal(getSchemaVersion(db), 1);
  } finally {
    db.close();
  }
});

test('future schema version is refused without touching data', () => {
  const db = openTestDb();
  try {
    db.exec("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '99')");
    throwsCode(() => migrate(db), 'SCHEMA_VERSION_MISMATCH', 'newer than supported 1');
    assert.equal(getSchemaVersion(db), 99);
  } finally {
    db.close();
  }
});

test('corrupt version values fail closed', () => {
  const db = openTestDb();
  try {
    db.exec("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', 'abc')");
    throwsCode(() => getSchemaVersion(db), 'SCHEMA_VERSION_INVALID');
    db.exec("DELETE FROM schema_meta WHERE key = 'version'");
    throwsCode(() => getSchemaVersion(db), 'SCHEMA_VERSION_INVALID');
    db.exec("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '007')");
    throwsCode(() => getSchemaVersion(db), 'SCHEMA_VERSION_INVALID');
  } finally {
    db.close();
  }
});

test('failed migration leaves the database at the last good version with data intact', () => {
  const db = openTestDb();
  try {
    const tx = expense({ refs, id: 'mig-keep', date: TODAY, account: acct('bank-ars'), amount: money(1000n, 'ARS'), category: cat('food') });
    db.exec("INSERT INTO accounts (id, name, type, currency) VALUES ('bank-ars', 'Bank ARS', 'ASSET', 'ARS')");
    db.exec("INSERT INTO categories (id, name, kind) VALUES ('food', 'Food', 'expense')");
    saveTransaction(db, tx);
    assert.throws(() => {
      migrate(db, [
        { version: 1, name: 'initial-ledger-schema', statements: [] },
        { version: 2, name: 'broken', statements: ['THIS IS NOT SQL'] },
      ]);
    });
    assert.equal(getSchemaVersion(db), 1);
    assert.deepEqual(loadTransaction(db, 'mig-keep'), tx);
  } finally {
    db.close();
  }
});

test('additive upgrade path applies cleanly over existing data', () => {
  const db = openTestDb();
  try {
    const tx = expense({ refs, id: 'mig-up', date: TODAY, account: acct('bank-ars'), amount: money(1000n, 'ARS'), category: cat('food') });
    db.exec("INSERT INTO accounts (id, name, type, currency) VALUES ('bank-ars', 'Bank ARS', 'ASSET', 'ARS')");
    db.exec("INSERT INTO categories (id, name, kind) VALUES ('food', 'Food', 'expense')");
    saveTransaction(db, tx);
    const version = migrate(db, [
      { version: 1, name: 'initial-ledger-schema', statements: [] },
      { version: 2, name: 'add-attachments', statements: ['CREATE TABLE attachments (id TEXT PRIMARY KEY)'] },
    ]);
    assert.equal(version, 2);
    assert.equal(getSchemaVersion(db), 2);
    assert.deepEqual(loadTransaction(db, 'mig-up'), tx);
  } finally {
    db.close();
  }
});
