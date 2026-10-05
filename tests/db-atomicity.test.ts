import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db, DbParam, DbRow } from '../src/persistence/db.ts';
import { saveTransaction } from '../src/persistence/repository.ts';
import { money } from '../src/domain/money.ts';
import { exchange, expense } from '../src/domain/operations.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

class FailAfter implements Db {
  private readonly inner: Db;
  private remaining: number;

  constructor(inner: Db, remaining: number) {
    this.inner = inner;
    this.remaining = remaining;
  }

  exec(sql: string, params: readonly DbParam[] = []): void {
    if (this.remaining <= 0) {
      throw new Error('injected write failure');
    }
    this.remaining -= 1;
    this.inner.exec(sql, params);
  }

  query(sql: string, params: readonly DbParam[] = []): DbRow[] {
    return this.inner.query(sql, params);
  }

  transaction<T>(fn: () => T): T {
    return this.inner.transaction(fn);
  }

  close(): void {
    this.inner.close();
  }
}

function counts(db: Db): { transactions: unknown; postings: unknown; conversions: unknown } {
  return {
    transactions: db.query('SELECT COUNT(*) AS c FROM transactions')[0]?.c,
    postings: db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c,
    conversions: db.query('SELECT COUNT(*) AS c FROM conversions')[0]?.c,
  };
}

function conversionCase(): Transaction {
  return exchange({
    refs,
    id: 'atom-fee',
    date: TODAY,
    from: acct('bank-ars'),
    to: acct('bank-usd'),
    amount: money(10000000n, 'ARS'),
    rate: RATE_1180,
    fee: { amount: money(50000n, 'ARS'), category: cat('fees') },
  });
}

test('successful commit writes transaction, conversion and all postings', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    saveTransaction(db, conversionCase());
    assert.deepEqual(counts(db), { transactions: 1, postings: 5, conversions: 1 });
  } finally {
    db.close();
  }
});

test('invalid transaction is rejected before any write', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const broken: Transaction = {
      id: 'broken',
      date: TODAY,
      postings: [
        { accountId: 'bank-ars', currency: 'ARS', amount: -1000n, kind: 'normal' },
        { accountId: 'sys:expense', currency: 'ARS', amount: 1000n, kind: 'normal', categoryId: 'ghost' },
      ],
    };
    throwsCode(() => saveTransaction(db, broken), 'INVALID_TRANSACTION');
    assert.deepEqual(counts(db), { transactions: 0, postings: 0, conversions: 0 });
  } finally {
    db.close();
  }
});

test('injected failure on the first write rolls back everything', () => {
  const inner = openTestDb();
  try {
    seedStandardRefs(inner);
    const db = new FailAfter(inner, 0);
    assert.throws(() => saveTransaction(db, conversionCase()), /injected write failure/);
    assert.deepEqual(counts(inner), { transactions: 0, postings: 0, conversions: 0 });
  } finally {
    inner.close();
  }
});

test('injected failure mid-postings rolls back everything', () => {
  const inner = openTestDb();
  try {
    seedStandardRefs(inner);
    const db = new FailAfter(inner, 2);
    assert.throws(() => saveTransaction(db, conversionCase()), /injected write failure/);
    assert.deepEqual(counts(inner), { transactions: 0, postings: 0, conversions: 0 });
  } finally {
    inner.close();
  }
});

test('raw multi-statement failure inside one transaction leaves no partial rows', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    assert.throws(() => {
      db.transaction(() => {
        db.exec("INSERT INTO transactions (id, date) VALUES ('partial', '2026-10-04')");
        throw new Error('boom between statements');
      });
    }, /boom between statements/);
    assert.deepEqual(counts(db), { transactions: 0, postings: 0, conversions: 0 });
  } finally {
    db.close();
  }
});

test('duplicate transaction id keeps the previous committed state', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const tx = expense({ refs, id: 'atom-dup', date: TODAY, account: acct('bank-ars'), amount: money(1000n, 'ARS'), category: cat('food') });
    saveTransaction(db, tx);
    throwsCode(() => saveTransaction(db, tx), 'DUPLICATE_TRANSACTION_ID');
    assert.deepEqual(counts(db), { transactions: 1, postings: 2, conversions: 0 });
  } finally {
    db.close();
  }
});
