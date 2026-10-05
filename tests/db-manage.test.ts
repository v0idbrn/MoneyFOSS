import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { expense } from '../src/domain/operations.ts';
import {
  deleteAccount,
  deleteCategory,
  deleteTransaction,
  hasCategoryUse,
  hasPostings,
  listAccounts,
  listCategories,
  loadTransaction,
  renameAccount,
  renameCategory,
  saveTransaction,
} from '../src/persistence/repository.ts';
import { TODAY, acct, cat, refs } from './fixtures.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';

test('account delete is guarded by postings, rename works', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    assert.equal(hasPostings(db, 'bank-ars'), false);
    renameAccount(db, 'bank-ars', 'Main Bank');
    assert.equal(listAccounts(db).find((a) => a.id === 'bank-ars')?.name, 'Main Bank');
    deleteAccount(db, 'cash-ars');
    assert.equal(listAccounts(db).some((a) => a.id === 'cash-ars'), false);
    throwsCode(() => deleteAccount(db, 'ghost'), 'UNKNOWN_ACCOUNT');
    throwsCode(() => renameAccount(db, 'bank-ars', ''), 'INVALID_ACCOUNT');

    const tx = expense({ refs, id: 'm1', date: TODAY, account: acct('bank-ars'), amount: money(100n, 'ARS'), category: cat('food') });
    saveTransaction(db, tx);
    assert.equal(hasPostings(db, 'bank-ars'), true);
    throwsCode(() => deleteAccount(db, 'bank-ars'), 'ACCOUNT_HAS_POSTINGS');
    assert.equal(listAccounts(db).some((a) => a.id === 'bank-ars'), true);
  } finally {
    db.close();
  }
});

test('category delete is guarded by use, rename works', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    assert.equal(hasCategoryUse(db, 'food'), false);
    renameCategory(db, 'food', 'Food & Drink');
    assert.equal(listCategories(db).find((c) => c.id === 'food')?.name, 'Food & Drink');
    deleteCategory(db, 'fees');
    assert.equal(listCategories(db).some((c) => c.id === 'fees'), false);
    throwsCode(() => deleteCategory(db, 'ghost'), 'UNKNOWN_CATEGORY');

    const tx = expense({ refs, id: 'm2', date: TODAY, account: acct('bank-ars'), amount: money(100n, 'ARS'), category: cat('food') });
    saveTransaction(db, tx);
    assert.equal(hasCategoryUse(db, 'food'), true);
    throwsCode(() => deleteCategory(db, 'food'), 'CATEGORY_IN_USE');
  } finally {
    db.close();
  }
});

test('transaction delete removes rows atomically', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const tx = expense({ refs, id: 'm3', date: TODAY, account: acct('bank-ars'), amount: money(100n, 'ARS'), category: cat('food') });
    saveTransaction(db, tx);
    deleteTransaction(db, 'm3');
    throwsCode(() => loadTransaction(db, 'm3'), 'TRANSACTION_NOT_FOUND');
    assert.equal(db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c, 0);
    throwsCode(() => deleteTransaction(db, 'm3'), 'TRANSACTION_NOT_FOUND');
  } finally {
    db.close();
  }
});
