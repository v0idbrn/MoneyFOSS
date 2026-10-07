import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetId, type Budget } from '../src/domain/types.ts';
import { deleteBudget, deleteCategory, listBudgets, saveBudget } from '../src/persistence/repository.ts';
import { budgetProgress, monthOfDate } from '../app/src/lib/budgets.ts';
import { expense, income, transfer } from '../src/domain/operations.ts';
import { money } from '../src/domain/money.ts';
import { openTestDb, seedStandardRefs, throwsCode } from './db-fixtures.ts';
import { TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function foodBudget(overrides: Partial<Budget> = {}): Budget {
  return { id: budgetId('food', 'ARS'), categoryId: 'food', currency: 'ARS', amountMinor: 50000n, ...overrides };
}

test('budgets CRUD: upsert per category+currency and boundary validation', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  const budget = foodBudget();
  saveBudget(db, budget);
  assert.deepEqual(listBudgets(db), [budget]);

  saveBudget(db, foodBudget({ amountMinor: 60000n }));
  assert.equal(listBudgets(db)[0]?.amountMinor, 60000n, 're-entering the same category+currency updates the limit');

  throwsCode(() => saveBudget(db, foodBudget({ amountMinor: 0n })), 'INVALID_BUDGET');
  throwsCode(() => saveBudget(db, foodBudget({ amountMinor: -1n })), 'INVALID_BUDGET');
  throwsCode(() => saveBudget(db, foodBudget({ amountMinor: 2n ** 63n })), 'AMOUNT_OUT_OF_INT64_RANGE');
  throwsCode(() => saveBudget(db, foodBudget({ categoryId: 'ghost' })), 'UNKNOWN_CATEGORY');
  throwsCode(() => saveBudget(db, foodBudget({ id: 'wrong-id' })), 'INVALID_BUDGET');
  throwsCode(() => saveBudget(db, foodBudget({ currency: 'XXX' })), 'UNKNOWN_CURRENCY');

  deleteBudget(db, budget.id);
  assert.deepEqual(listBudgets(db), []);
  throwsCode(() => deleteBudget(db, budget.id), 'UNKNOWN_BUDGET');
});

test('deleting a category cascades its budgets', () => {
  const db = openTestDb();
  seedStandardRefs(db);
  saveBudget(db, foodBudget());
  deleteCategory(db, 'food');
  assert.deepEqual(listBudgets(db), []);
});

test('budget measurement: month boundary, currency isolation, no-category movements, refunds', () => {
  const month = '2026-10';
  const txs: Transaction[] = [
    expense({ refs, id: 'b-in', date: '2026-10-04', account: acct('bank-ars'), amount: money(125099n, 'ARS'), category: cat('food') }),
    expense({ refs, id: 'b-prev', date: '2026-09-30', account: acct('bank-ars'), amount: money(99999n, 'ARS'), category: cat('food') }),
    expense({ refs, id: 'b-usd', date: '2026-10-04', account: acct('bank-usd'), amount: money(500n, 'USD'), category: cat('food') }),
    transfer({ refs, id: 'b-move', date: '2026-10-04', from: acct('bank-ars'), to: acct('cash-ars'), amount: money(700000n, 'ARS') }),
    income({ refs, id: 'b-pay', date: '2026-10-01', account: acct('bank-ars'), amount: money(300000n, 'ARS'), category: cat('salary') }),
    {
      id: 'b-refund',
      date: '2026-10-10',
      postings: [
        { accountId: 'bank-ars', currency: 'ARS', amount: 20000n, kind: 'normal' },
        { accountId: 'sys:expense', currency: 'ARS', amount: -20000n, kind: 'normal', categoryId: 'food' },
      ],
    },
  ];

  const ars = budgetProgress(foodBudget(), txs, month, 'expense');
  assert.equal(ars.spent, 125099n - 20000n, 'only this month, this currency, category postings; refund subtracts');
  assert.equal(ars.remaining, 50000n - ars.spent);

  const usdFood: Budget = foodBudget({ id: budgetId('food', 'USD'), currency: 'USD', amountMinor: 100000n });
  assert.equal(budgetProgress(usdFood, txs, month, 'expense').spent, 500n, 'USD limit only sees USD postings');

  const salary: Budget = { id: budgetId('salary', 'ARS'), categoryId: 'salary', currency: 'ARS', amountMinor: 100000n };
  assert.equal(budgetProgress(salary, txs, month, 'income').spent, 300000n, 'income budgets measure income postings as positive');

  assert.equal(monthOfDate('2026-09-30'), '2026-09');
  throwsCode(() => budgetProgress(foodBudget(), txs, '2026-13', 'expense'), 'INVALID_BUDGET');
  throwsCode(() => budgetProgress(foodBudget(), txs, 'October', 'expense'), 'INVALID_BUDGET');
});
