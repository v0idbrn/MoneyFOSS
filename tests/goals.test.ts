import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { goalId, type Goal } from '../src/domain/types.ts';
import { deleteAccount, deleteGoal, getGoal, listGoals, saveGoal } from '../src/persistence/repository.ts';
import { goalProgress } from '../app/src/lib/goals.ts';
import { expense, income, transfer } from '../src/domain/operations.ts';
import { money } from '../src/domain/money.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';
import { TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function demoGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: goalId('vacation', 'ARS'),
    name: 'Vacation 2026',
    currency: 'ARS',
    targetMinor: 5000000n,
    targetDate: '2026-12-31',
    accountIds: ['bank-ars'],
    ...overrides,
  };
}

function demoTransactions(): Transaction[] {
  return [
    expense({ refs, id: 'g-exp1', date: TODAY, account: acct('bank-ars'), amount: money(125099n, 'ARS'), category: cat('food') }),
    income({ refs, id: 'g-inc1', date: TODAY, account: acct('bank-ars'), amount: money(500000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'g-trf1', date: TODAY, from: acct('bank-ars'), to: acct('cash-ars'), amount: money(20000n, 'ARS') }),
  ];
}

test('goals CRUD: create, read, update, delete', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal();
  saveGoal(db, goal);
  const listed = listGoals(db);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.name, 'Vacation 2026');
  assert.equal(listed[0]?.currency, 'ARS');
  assert.equal(listed[0]?.targetMinor, 5000000n);
  assert.equal(listed[0]?.targetDate, '2026-12-31');
  assert.deepEqual(listed[0]?.accountIds, ['bank-ars']);

  saveGoal(db, demoGoal({ targetMinor: 6000000n, targetDate: '2026-11-30' }));
  assert.equal(listGoals(db)[0]?.targetMinor, 6000000n, 're-entering same id updates the goal');
  assert.equal(listGoals(db)[0]?.targetDate, '2026-11-30');

  deleteGoal(db, goal.id);
  assert.deepEqual(listGoals(db), []);
  throwsCode(() => deleteGoal(db, goal.id), 'UNKNOWN_GOAL');
});

test('goals validation: targetMinor > 0, valid currency, non-empty accountIds', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  throwsCode(() => saveGoal(db, demoGoal({ targetMinor: 0n })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ targetMinor: -1n })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ targetMinor: 2n ** 63n })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ currency: 'XXX' })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ accountIds: [] })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ accountIds: ['ghost'] })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ accountIds: ['bank-usd'] })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ accountIds: ['bank-ars', 'bank-ars'] })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ targetDate: '2026-13' })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ targetDate: 'invalid' })), 'INVALID_GOAL');
  throwsCode(() => saveGoal(db, demoGoal({ name: '' })), 'INVALID_GOAL');
});

test('goals with multiple accounts sum balances correctly', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ accountIds: ['bank-ars', 'cash-ars'] });
  saveGoal(db, goal);

  const txs: Transaction[] = [
    expense({ refs, id: 'g1', date: TODAY, account: acct('bank-ars'), amount: money(100000n, 'ARS'), category: cat('food') }),
    income({ refs, id: 'g2', date: TODAY, account: acct('cash-ars'), amount: money(50000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'g3', date: TODAY, from: acct('bank-ars'), to: acct('cash-ars'), amount: money(20000n, 'ARS') }),
  ];

  const progress = goalProgress(goal, txs);
  // expense on bank-ars = -100000, income on cash-ars = +50000; transfer nets to zero across both accounts
  assert.equal(progress.progress, -100000n + 50000n, 'progress is the sum of account balances');
  assert.equal(progress.remaining, 5000000n - progress.progress);
});

test('goal progress: negative balance subtracts', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ targetMinor: 100000n });
  saveGoal(db, goal);

  const txs: Transaction[] = [
    {
      id: 'neg1',
      date: TODAY,
      postings: [
        { accountId: 'bank-ars', currency: 'ARS', amount: -50000n, kind: 'normal', categoryId: 'food' },
        { accountId: 'sys:expense', currency: 'ARS', amount: 50000n, kind: 'normal', categoryId: 'food' },
      ],
    },
  ];

  const progress = goalProgress(goal, txs);
  assert.equal(progress.progress, -50000n, 'negative balance subtracts from progress');
  assert.equal(progress.remaining, 100000n - (-50000n));
});

test('goal progress: over target', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ targetMinor: 100000n });
  saveGoal(db, goal);

  const txs: Transaction[] = [
    income({ refs, id: 'over1', date: TODAY, account: acct('bank-ars'), amount: money(200000n, 'ARS'), category: cat('salary') }),
  ];

  const progress = goalProgress(goal, txs);
  assert.equal(progress.progress, 200000n);
  assert.equal(progress.remaining, -100000n, 'remaining can be negative when over target');
  assert.ok(progress.percentage !== null && progress.percentage > 100);
});

test('goal progress: currency isolation', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goalArs = demoGoal({ currency: 'ARS', targetMinor: 100000n });
  const goalUsd = demoGoal({ id: goalId('vacation', 'USD'), currency: 'USD', targetMinor: 5000n, accountIds: ['bank-usd'] });
  saveGoal(db, goalArs);
  saveGoal(db, goalUsd);

  const txs: Transaction[] = [
    expense({ refs, id: 'c1', date: TODAY, account: acct('bank-ars'), amount: money(100000n, 'ARS'), category: cat('food') }),
    expense({ refs, id: 'c2', date: TODAY, account: acct('bank-usd'), amount: money(1000n, 'USD'), category: cat('food') }),
  ];

  const arsProgress = goalProgress(goalArs, txs);
  const usdProgress = goalProgress(goalUsd, txs);
  // expenses reduce the account balance, so progress is negative; currencies stay isolated
  assert.equal(arsProgress.progress, -100000n);
  assert.equal(usdProgress.progress, -1000n);
});

test('getGoal reads a single goal with its accounts', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ accountIds: ['bank-ars', 'cash-ars'] });
  saveGoal(db, goal);
  const loaded = getGoal(db, goal.id);
  assert.equal(loaded.name, 'Vacation 2026');
  assert.deepEqual(loaded.accountIds, ['bank-ars', 'cash-ars']);
  assert.equal(loaded.targetMinor, 5000000n);
  throwsCode(() => getGoal(db, 'ghost'), 'UNKNOWN_GOAL');
});

test('failed goal update leaves the previous state intact', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  saveGoal(db, demoGoal());
  throwsCode(() => saveGoal(db, demoGoal({ targetMinor: 0n })), 'INVALID_GOAL');
  const kept = getGoal(db, demoGoal().id);
  assert.equal(kept.targetMinor, 5000000n);
  assert.deepEqual(kept.accountIds, ['bank-ars']);
});

test('goal deletion does not delete accounts', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ accountIds: ['bank-ars'] });
  saveGoal(db, goal);
  deleteGoal(db, goal.id);
  // account should still exist
  const accounts = db.query('SELECT id FROM accounts WHERE id = ?', ['bank-ars']);
  assert.equal(accounts.length, 1);
});

test('account deletion blocked when used by goal', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal({ accountIds: ['bank-ars'] });
  saveGoal(db, goal);
  throwsCode(() => deleteAccount(db, 'bank-ars'), 'ACCOUNT_IN_GOAL');
});

test('goal JSON export round-trip', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const goal = demoGoal();
  saveGoal(db, goal);
  const listed = listGoals(db);
  assert.equal(listed.length, 1);
  const goalJson = JSON.stringify(listed[0], (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  assert.ok(goalJson.includes('Vacation 2026'));
  assert.ok(goalJson.includes('ARS'));
  assert.ok(goalJson.includes('5000000'));
  assert.ok(goalJson.includes('bank-ars'));
});