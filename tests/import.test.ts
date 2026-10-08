import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { exchange, expense, income } from '../src/domain/operations.ts';
import { money } from '../src/domain/money.ts';
import { stableStringify, toWire } from '../src/domain/serialize.ts';
import { listAccounts, listCategories, listTransactions, loadRefs, saveAccount, saveTransaction } from '../src/persistence/repository.ts';
import type { Db, DbParam, DbRow } from '../src/persistence/db.ts';
import { TRANSACTIONS_CSV_HEADER } from '../app/src/lib/export-data.ts';
import { transactionsCsv } from '../app/src/lib/export-data.ts';
import { applyImport, planImport, type ImportPlan } from '../app/src/lib/import-csv.ts';
import { toCsv } from '../app/src/lib/csv.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function demoTransactions(): Transaction[] {
  return [
    expense({ refs, id: 'exp1', date: TODAY, account: acct('bank-ars'), amount: money(125099n, 'ARS'), category: cat('food'), memo: 'Almuerzo, con "amigos"' }),
    income({ refs, id: 'inc1', date: TODAY, account: acct('bank-usd'), amount: money(200000n, 'USD'), category: cat('salary') }),
    exchange({ refs, id: 'exg1', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
  ];
}

function seedDbWithDemo(): Db {
  const db = openTestDb();
  seedStandardRefs(db);
  for (const tx of demoTransactions()) {
    saveTransaction(db, tx);
  }
  return db;
}

function wiresOf(db: Db): string[] {
  return listTransactions(db).map((tx) => stableStringify(toWire(tx)));
}

function cells(overrides: Record<string, string>): string[] {
  const row: Record<string, string> = Object.fromEntries(TRANSACTIONS_CSV_HEADER.map((name) => [name, '']));
  row.tx_id = 'hand1';
  row.date = TODAY;
  row.position = '0';
  row.account_id = 'bank-ars';
  row.account_name = 'Bank ARS';
  row.account_type = 'ASSET';
  row.currency = 'ARS';
  row.amount_minor = '-1000';
  row.kind = 'normal';
  Object.assign(row, overrides);
  return TRANSACTIONS_CSV_HEADER.map((name) => row[name] ?? '');
}

function handCsv(...rows: string[][]): string {
  return toCsv([[...TRANSACTIONS_CSV_HEADER], ...rows]);
}

function pairedExpenseCsv(overrides: Record<string, string> = {}): string {
  return handCsv(
    cells({ ...overrides }),
    cells({ ...overrides, position: '1', account_id: 'sys:expense', account_name: '', account_type: '', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
  );
}

test('csv export imports into an empty database with atomic creation of accounts and categories', () => {
  const source = seedDbWithDemo();
  const csv = transactionsCsv(listTransactions(source), listAccounts(source), listCategories(source));

  const target = openTestDb();
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.rejected.length, 0, JSON.stringify(plan.rejected));
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.duplicates.length, 0);
  assert.equal(plan.newTransactions.length, demoTransactions().length);
  assert.equal(plan.newAccounts.length, 2, 'only accounts referenced by accepted transactions are created (bank-ars, bank-usd)');
  assert.ok(plan.newCategories.some((category) => category.id === 'food' && category.kind === 'expense'), 'categories referenced by postings must be created');

  applyImport(target, plan);
  assert.deepEqual(wiresOf(target), wiresOf(source));
  assert.equal(listAccounts(target).length, 2, 'fresh db had no accounts; only referenced ones exist now');

  const again = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(again.newTransactions.length, 0);
  assert.equal(again.newAccounts.length, 0);
  assert.equal(again.duplicates.length, demoTransactions().length, 're-importing the same file must classify every tx as duplicate');
  applyImport(target, again);
  assert.deepEqual(wiresOf(target), wiresOf(source), 'second import must be a no-op');
});

test('existing transaction with the same id and different content is a conflict, never overwritten', () => {
  const source = seedDbWithDemo();
  const csv = transactionsCsv(listTransactions(source), listAccounts(source), listCategories(source));
  const tampered = csv.replace(/125099/g, '125098');
  assert.notEqual(tampered, csv);

  const target = seedDbWithDemo();
  const before = wiresOf(target);
  const plan = planImport(tampered, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0]?.txId, 'exp1');
  assert.equal(plan.newTransactions.length, 0);
  applyImport(target, plan);
  assert.deepEqual(wiresOf(target), before, 'conflicting import must keep existing content');
});

test('unknown accounts and malformed rows are rejected with reasons, not partially applied', () => {
  const target = seedDbWithDemo();

  const unknown = planImport(pairedExpenseCsv({ account_id: 'mystery', account_name: '', account_type: '' }), {
    refs: loadRefs(target),
    transactions: listTransactions(target),
  });
  assert.equal(unknown.rejected.length, 1);
  assert.equal(unknown.rejected[0]?.reason, 'unknown-account');
  assert.equal(unknown.newTransactions.length, 0);

  const badAmount = planImport(pairedExpenseCsv({ amount_minor: '12,50' }), { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(badAmount.rejected[0]?.reason, 'bad-row');

  const unbalanced = planImport(handCsv(cells({ amount_minor: '-999' })), { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(unbalanced.rejected.length, 1);
  assert.equal(unbalanced.rejected[0]?.reason, 'invalid-transaction');

  assert.equal(listTransactions(target).length, 3, 'planning must not write anything');
});

test('currency and category-kind violations fail through the domain validator', () => {
  const target = seedDbWithDemo();

  const wrongCurrency = planImport(
    handCsv(
      cells({ currency: 'USD', amount_minor: '-1000' }),
      cells({ position: '1', account_id: 'sys:expense', account_name: '', account_type: '', currency: 'USD', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
    ),
    { refs: loadRefs(target), transactions: listTransactions(target) },
  );
  assert.equal(wrongCurrency.rejected[0]?.reason, 'invalid-transaction');
  assert.match(wrongCurrency.rejected[0]?.detail ?? '', /ARS/);

  const wrongKind = planImport(
    handCsv(
      cells({ account_id: 'sys:expense', account_name: '', account_type: '', amount_minor: '1000', category_id: 'salary', category_name: 'Sueldo' }),
      cells({ position: '1', account_id: 'bank-ars', amount_minor: '-1000' }),
    ),
    { refs: loadRefs(target), transactions: listTransactions(target) },
  );
  assert.equal(wrongKind.rejected[0]?.reason, 'invalid-transaction');
  assert.match(wrongKind.rejected[0]?.detail ?? '', /income but the posting is on sys:expense/);
});

test('inconsistent account definitions across groups reject every group that needs them', () => {
  const target = openTestDb();
  seedStandardRefs(target);
  const csv = handCsv(
    cells({ account_id: 'new-acc', account_name: 'One', account_type: 'ASSET' }),
    cells({ position: '1', account_id: 'sys:expense', account_name: '', account_type: '', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
    cells({ tx_id: 'hand2', account_id: 'new-acc', account_name: 'Other', account_type: 'LIABILITY' }),
    cells({ tx_id: 'hand2', position: '1', account_id: 'sys:expense', account_name: '', account_type: '', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
  );
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.newTransactions.length, 0);
  assert.equal(plan.rejected.length, 2);
  assert.ok(plan.rejected.every((entry) => entry.reason === 'account-conflict'), JSON.stringify(plan.rejected));
  assert.equal(plan.newAccounts.length, 0, 'accounts needed only by rejected groups must not be created');
});

test('mixed conversion cells reject the group', () => {
  const source = seedDbWithDemo();
  const csv = transactionsCsv(listTransactions(source), listAccounts(source), listCategories(source));
  const rows = csv.split('\n').filter((line) => line !== '');
  const header = (rows[0] ?? '').split(',');
  const convFrom = header.indexOf('conv_from');
  const broken = rows.map((line, index) => {
    if (index === 0 || !line.includes('exg1')) {
      return line;
    }
    const cols = line.split(',');
    cols[convFrom] = '';
    return cols.join(',');
  });
  const plan = planImport(broken.join('\n'), { refs: loadRefs(source), transactions: listTransactions(source) });
  assert.ok(plan.rejected.some((entry) => entry.reason === 'mixed-conversion'), JSON.stringify(plan.rejected));
});

test('header and empty input are rejected before touching the database', () => {
  const target = seedDbWithDemo();
  throwsCode(() => planImport('', { refs: loadRefs(target), transactions: listTransactions(target) }), 'CSV_INVALID');
  throwsCode(() => planImport('date,amount\n2026-10-04,100\n', { refs: loadRefs(target), transactions: listTransactions(target) }), 'CSV_INVALID');
});

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

test('applyImport is atomic: a failure mid-apply rolls back accounts, categories and transactions', () => {
  const source = seedDbWithDemo();
  const csv = transactionsCsv(listTransactions(source), listAccounts(source), listCategories(source));
  const target = openTestDb();
  seedStandardRefs(target);
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.ok(plan.newTransactions.length > 0);

  const failing = new FailAfter(target, 1);
  assert.throws(() => applyImport(failing, plan), /injected write failure/);
  assert.deepEqual(listTransactions(target), [], 'no transaction may survive a failed apply');
  assert.equal(listAccounts(target).length, 5, 'no account may survive a failed apply');
});

test('nested transactions execute inside the outer one and roll back together', () => {
  const db = openTestDb();
  assert.throws(() => {
    db.transaction(() => {
      saveAccount(db, { id: 'outer', name: 'Outer', type: 'ASSET', currency: 'ARS' });
      db.transaction(() => {
        saveAccount(db, { id: 'inner', name: 'Inner', type: 'ASSET', currency: 'ARS' });
      });
      throw new Error('abort after nesting');
    });
  }, /abort after nesting/);
  assert.equal(listAccounts(db).length, 0, 'outer rollback must include nested work');
});

test('import plan validation runs before any write: an invalid plan never mutates', () => {
  const db = seedDbWithDemo();
  const ghost: Transaction = {
    id: 'ghost',
    date: TODAY,
    postings: [
      { accountId: 'missing', currency: 'ARS', amount: 1000n, kind: 'normal' },
      { accountId: 'sys:expense', currency: 'ARS', amount: -1000n, kind: 'normal' },
    ],
  };
  const evil: ImportPlan = {
    newAccounts: [],
    newCategories: [],
    newTransactions: [ghost],
    duplicates: [],
    conflicts: [],
    rejected: [],
    dataRows: 1,
  };
  assert.throws(() => applyImport(db, evil), /unknown account/);
  assert.deepEqual(wiresOf(db), demoTransactions().map((tx) => stableStringify(toWire(tx))));
});

test('position > 6 digits is rejected', () => {
  const target = openTestDb();
  seedStandardRefs(target);
  const csv = pairedExpenseCsv({ position: '1000000' });
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.rejected[0]?.reason, 'bad-row');
  assert.match(plan.rejected[0]?.detail ?? '', /position must be an integer of at most 6 digits/);
});

test('duplicate positions inside a transaction are rejected', () => {
  const target = openTestDb();
  seedStandardRefs(target);
  const csv = handCsv(
    cells({ position: '0', account_id: 'bank-ars', amount_minor: '-1000' }),
    cells({ position: '0', account_id: 'sys:expense', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
    cells({ tx_id: 'hand2', position: '0', account_id: 'bank-ars', amount_minor: '-1000' }),
    cells({ tx_id: 'hand2', position: '0', account_id: 'sys:expense', amount_minor: '1000', category_id: 'cat:food', category_name: 'Comida' }),
  );
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.ok(plan.rejected.some((entry) => entry.reason === 'bad-row' && entry.detail.includes('duplicate posting position')));
});

test('amount int64 overflow is rejected', () => {
  const target = openTestDb();
  seedStandardRefs(target);
  const csv = pairedExpenseCsv({ amount_minor: '9223372036854775808' });
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.rejected.length, 1);
  assert.equal(plan.rejected[0]?.reason, 'invalid-transaction');
});

test('unicode memo round-trips through CSV', () => {
  const source = seedDbWithDemo();
  const txWithUnicode = expense({
    refs,
    id: 'unicode1',
    date: TODAY,
    account: acct('bank-ars'),
    amount: money(123456n, 'ARS'),
    category: cat('food'),
    memo: 'café 🍵 中文 \u00A0\t\n',
  });
  saveTransaction(source, txWithUnicode);
  const csv = transactionsCsv(listTransactions(source), listAccounts(source), listCategories(source));

  const target = openTestDb();
  seedStandardRefs(target);
  const plan = planImport(csv, { refs: loadRefs(target), transactions: listTransactions(target) });
  assert.equal(plan.rejected.length, 0, JSON.stringify(plan.rejected));
  applyImport(target, plan);
  const imported = listTransactions(target).find((tx) => tx.id === 'unicode1');
  assert.ok(imported);
  assert.equal(imported.memo, 'café 🍵 中文 \u00A0\t\n');
});
