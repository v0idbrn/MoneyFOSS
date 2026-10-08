import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/domain/money.ts';
import { cardPayment, cardPurchase, exchange, expense, income, transfer } from '../src/domain/operations.ts';
import {
  listAccounts,
  listCategories,
  listTransactions,
  loadRefs,
  loadTransaction,
  saveAccount,
  saveCategory,
  saveTransaction,
} from '../src/persistence/repository.ts';
import type { Transaction } from '../src/domain/types.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';

function canonicalCases(): Transaction[] {
  return [
    expense({ refs, id: 'c1', date: TODAY, account: acct('bank-ars'), amount: money(1000000n, 'ARS'), category: cat('food') }),
    income({ refs, id: 'c2', date: TODAY, account: acct('bank-ars'), amount: money(10000000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'c3', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(500000n, 'ARS') }),
    expense({ refs, id: 'c4', date: TODAY, account: acct('bank-usd'), amount: money(2000n, 'USD'), category: cat('food') }),
    income({ refs, id: 'c5', date: TODAY, account: acct('bank-usd'), amount: money(50000n, 'USD'), category: cat('freelance') }),
    cardPurchase({ refs, id: 'c6', date: TODAY, account: acct('card-ars'), amount: money(1000000n, 'ARS'), category: cat('food') }),
    cardPayment({ refs, id: 'c7', date: TODAY, from: acct('bank-ars'), to: acct('card-ars'), amount: money(1000000n, 'ARS') }),
    exchange({ refs, id: 'c8', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
    expense({ refs, id: 'c9', date: TODAY, account: acct('bank-usd'), amount: money(1000000n, 'ARS'), category: cat('food'), rate: RATE_1180 }),
    exchange({
      refs,
      id: 'c10',
      date: TODAY,
      from: acct('bank-ars'),
      to: acct('bank-usd'),
      amount: money(10000000n, 'ARS'),
      rate: RATE_1180,
      fee: { amount: money(50000n, 'ARS'), category: cat('fees') },
    }),
  ];
}

function byId(txs: readonly Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function accountSums(txs: readonly Transaction[]): Map<string, Map<string, bigint>> {
  const out = new Map<string, Map<string, bigint>>();
  for (const tx of txs) {
    for (const posting of tx.postings) {
      let currencies = out.get(posting.accountId);
      if (!currencies) {
        currencies = new Map<string, bigint>();
        out.set(posting.accountId, currencies);
      }
      currencies.set(posting.currency, (currencies.get(posting.currency) ?? 0n) + posting.amount);
    }
  }
  return out;
}

test('accounts and categories roundtrip through the database', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    assert.deepEqual(listAccounts(db), [...refs.accounts.values()]);
    assert.deepEqual(listCategories(db), [...refs.categories.values()]);
    assert.equal(loadRefs(db).accounts.size, refs.accounts.size);
  } finally {
    db.close();
  }
});

test('all 10 canonical cases persist and reconstruct identical domain objects', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const originals = canonicalCases();
    for (const tx of originals) {
      saveTransaction(db, tx);
    }
    assert.deepEqual(byId(listTransactions(db)), byId(originals));
    for (const tx of originals) {
      assert.deepEqual(loadTransaction(db, tx.id), tx);
    }
  } finally {
    db.close();
  }
});

test('missing transaction load fails closed', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    throwsCode(() => loadTransaction(db, 'ghost'), 'TRANSACTION_NOT_FOUND');
  } finally {
    db.close();
  }
});

test('duplicate ids are rejected and prior state is untouched', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const tx = canonicalCases()[0]!;
    saveTransaction(db, tx);
    throwsCode(() => saveTransaction(db, tx), 'DUPLICATE_TRANSACTION_ID');
    throwsCode(() => saveAccount(db, acct('bank-ars')), 'DUPLICATE_ACCOUNT_ID');
    throwsCode(() => saveCategory(db, cat('food')), 'DUPLICATE_CATEGORY_ID');
    assert.deepEqual(loadTransaction(db, tx.id), tx);
    assert.equal(db.query('SELECT COUNT(*) AS c FROM transactions')[0]?.c, 1);
    assert.equal(db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c, 2);
  } finally {
    db.close();
  }
});

test('invalid accounts and categories are rejected before any write', () => {
  const db = openTestDb();
  try {
    throwsCode(
      () => saveAccount(db, { id: 'x', name: 'X', type: 'INCOME' as never, currency: 'ARS' }),
      'INVALID_ACCOUNT',
    );
    throwsCode(() => saveAccount(db, { id: 'x', name: '', type: 'ASSET', currency: 'ARS' }), 'INVALID_ACCOUNT');
    throwsCode(() => saveAccount(db, { id: 'x', name: 'X', type: 'ASSET', currency: 'XXX' }), 'UNKNOWN_CURRENCY');
    throwsCode(() => saveAccount(db, { id: 'sys:fx:ars', name: 'X', type: 'ASSET', currency: 'ARS' }), 'INVALID_ACCOUNT');
    throwsCode(() => saveCategory(db, { id: 'y', name: 'Y', kind: 'weird' as never }), 'INVALID_CATEGORY');
    assert.equal(db.query('SELECT COUNT(*) AS c FROM accounts')[0]?.c, 0);
    assert.equal(db.query('SELECT COUNT(*) AS c FROM categories')[0]?.c, 0);
  } finally {
    db.close();
  }
});

test('invalid domain transaction never touches the database', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const broken: Transaction = {
      id: 'broken',
      date: TODAY,
      postings: [
        { accountId: 'bank-ars', currency: 'ARS', amount: -1000n, kind: 'normal' },
        { accountId: 'bank-ars', currency: 'ARS', amount: 999n, kind: 'normal' },
      ],
    };
    throwsCode(() => saveTransaction(db, broken), 'INVALID_TRANSACTION');
    assert.equal(db.query('SELECT COUNT(*) AS c FROM transactions')[0]?.c, 0);
    assert.equal(db.query('SELECT COUNT(*) AS c FROM postings')[0]?.c, 0);
    assert.equal(db.query('SELECT COUNT(*) AS c FROM conversions')[0]?.c, 0);
  } finally {
    db.close();
  }
});

test('balances derived from loaded state match pre-persistence derivation', () => {
  const db = openTestDb();
  try {
    seedStandardRefs(db);
    const originals = canonicalCases().filter((tx) => ['c1', 'c2', 'c3', 'c6', 'c7'].includes(tx.id));
    for (const tx of originals) {
      saveTransaction(db, tx);
    }
    const loaded = listTransactions(db);
    assert.deepEqual(accountSums(loaded), accountSums(originals));
    const bankArs = accountSums(loaded).get('bank-ars')?.get('ARS');
    assert.equal(bankArs, 8500000n);
    assert.equal(accountSums(loaded).get('card-ars')?.get('ARS'), 0n);
    assert.equal(accountSums(loaded).get('cash-ars')?.get('ARS'), -500000n);
  } finally {
    db.close();
  }
});

test('same logical state in two databases reconstructs identically', () => {
  const first = openTestDb();
  const second = openTestDb();
  try {
    seedStandardRefs(first);
    seedStandardRefs(second);
    for (const tx of canonicalCases()) {
      saveTransaction(first, tx);
      saveTransaction(second, tx);
    }
    assert.deepEqual(listTransactions(second), listTransactions(first));
  } finally {
    first.close();
    second.close();
  }
});
