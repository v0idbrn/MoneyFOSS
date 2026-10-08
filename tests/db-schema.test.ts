import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openNodeDb } from '../src/persistence/drivers/node-sqlite.ts';
import { getSchemaVersion, migrate } from '../src/persistence/migrate.ts';
import { SCHEMA_VERSION } from '../src/persistence/schema.ts';
import { openTestDb, tableNames } from './db-fixtures.ts';

test('fresh database migrates to version 3 with all tables', () => {
  const db = openNodeDb(':memory:');
  try {
    assert.equal(getSchemaVersion(db), 0);
    assert.equal(migrate(db), 3);
    assert.equal(getSchemaVersion(db), 3);
    assert.equal(SCHEMA_VERSION, 3);
    for (const expected of ['accounts', 'budgets', 'categories', 'conversions', 'goal_accounts', 'goals', 'postings', 'schema_meta', 'transactions']) {
      assert.ok(tableNames(db).includes(expected), `missing table ${expected}`);
    }
  } finally {
    db.close();
  }
});

test('foreign keys are enforced on this connection', () => {
  const db = openTestDb();
  try {
    assert.equal(db.query('PRAGMA foreign_keys')[0]?.foreign_keys, 1);
    assert.throws(() => {
      db.exec(
        "INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind) VALUES ('x', 'ghost', 0, 'bank-ars', 'ARS', '100', 'normal')",
      );
    });
    assert.equal(db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c, 0);
    assert.throws(() => {
      db.exec(
        "INSERT INTO conversions (transaction_id, from_currency, to_currency, rate_text, rate_num, rate_den, quote_direction, rate_at, source, rounding_mode) VALUES ('ghost', 'ARS', 'USD', '1180', '1180', '1', 'srcPerDest', '2026-10-04', 'manual', 'half-away-from-zero')",
      );
    });
  } finally {
    db.close();
  }
});

test('check constraints reject bad enums and duplicates', () => {
  const db = openTestDb();
  try {
    db.exec("INSERT INTO transactions (id, date) VALUES ('t1', '2026-10-04')");
    assert.throws(() => {
      db.exec("INSERT INTO accounts (id, name, type, currency) VALUES ('a', 'A', 'INCOME', 'ARS')");
    });
    assert.throws(() => {
      db.exec("INSERT INTO categories (id, name, kind) VALUES ('c', 'C', 'weird')");
    });
    assert.throws(() => {
      db.exec(
        "INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind) VALUES ('p', 't1', 0, 'a', 'ARS', '100', 'weird')",
      );
    });
    db.exec(
      "INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind) VALUES ('p', 't1', 0, 'a', 'ARS', '100', 'normal')",
    );
    assert.throws(
      () => {
        db.exec(
          "INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind) VALUES ('q', 't1', 0, 'a', 'ARS', '200', 'normal')",
        );
      },
      /UNIQUE/,
      'same transaction_id + position twice violates UNIQUE',
    );
    assert.throws(() => {
      db.exec("INSERT INTO transactions (id, date) VALUES ('t1', '2026-10-04')");
    });
    assert.throws(
      () => {
        db.exec(
          "INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind, category_id) VALUES ('r', 't1', 1, 'a', 'ARS', '100', 'normal', 'ghost')",
        );
      },
      /FOREIGN KEY/,
      'unknown category_id violates the category foreign key',
    );
    assert.throws(() => {
      db.exec("INSERT INTO budgets (id, category_id, currency, amount_minor) VALUES ('b', 'c', 'ARS', '0')");
    }, 'budget limit must be a positive integer string');
    assert.throws(() => {
      db.exec("INSERT INTO budgets (id, category_id, currency, amount_minor) VALUES ('b', 'c', 'ARS', '-10')");
    }, 'negative budget limit is rejected');
    assert.throws(() => {
      db.exec("INSERT INTO budgets (id, category_id, currency, amount_minor) VALUES ('b', 'ghost', 'ARS', '100')");
    }, /FOREIGN KEY/, 'budget must reference a real category');
  } finally {
    db.close();
  }
});
