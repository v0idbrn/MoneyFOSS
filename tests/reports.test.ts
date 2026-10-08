import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { expense, exchange, income, transfer } from '../src/domain/operations.ts';
import { money } from '../src/domain/money.ts';
import { monthOfDate } from '../app/src/lib/budgets.ts';
import { categoryFlowTotals, monthFlowTotals } from '../app/src/lib/reports.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Transaction } from '../src/domain/types.ts';

function demoTransactions(): Transaction[] {
  return [
    expense({ refs, id: 'exp1', date: TODAY, account: acct('bank-ars'), amount: money(125099n, 'ARS'), category: cat('food'), memo: 'Almuerzo' }),
    income({ refs, id: 'inc1', date: TODAY, account: acct('bank-ars'), amount: money(500000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'trf1', date: TODAY, from: acct('bank-ars'), to: acct('cash-ars'), amount: money(20000n, 'ARS') }),
    exchange({ refs, id: 'exg1', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
    expense({ refs, id: 'exp2', date: TODAY, account: acct('bank-usd'), amount: money(1000n, 'USD'), category: cat('food') }),
    expense({ refs, id: 'old', date: '2000-01-15', account: acct('bank-ars'), amount: money(999n, 'ARS'), category: cat('food') }),
  ];
}

const categories = [...refs.categories.values()];

test('month flow totals: per-currency income and expense, transfers and bridges excluded', () => {
  const month = monthOfDate(TODAY);
  const flows = monthFlowTotals(demoTransactions(), categories, month);
  const ars = flows.find((flow) => flow.currency === 'ARS');
  const usd = flows.find((flow) => flow.currency === 'USD');
  assert.ok(ars !== undefined && usd !== undefined);
  assert.equal(ars.expense, 125099n);
  assert.equal(ars.income, 500000n);
  assert.equal(usd.expense, 1000n);
  assert.equal(usd.income, 0n);
  assert.equal(flows.length, 2, 'other-month and non-categorized postings must not create rows');
  assert.deepEqual(flows.map((flow) => flow.currency), ['ARS', 'USD'], 'rows sort by currency');
});

test('month flow totals: only the requested month counts', () => {
  const flows = monthFlowTotals(demoTransactions(), categories, '2000-01');
  assert.deepEqual(flows, [{ currency: 'ARS', expense: 999n, income: 0n }]);
});

test('category flow totals: expense and income lists stay signed and sorted', () => {
  const month = monthOfDate(TODAY);
  const expenses = categoryFlowTotals(demoTransactions(), categories, month, 'expense');
  assert.deepEqual(expenses, [
    { categoryId: 'food', currency: 'ARS', total: 125099n },
    { categoryId: 'food', currency: 'USD', total: 1000n },
  ]);
  const incomes = categoryFlowTotals(demoTransactions(), categories, month, 'income');
  assert.deepEqual(incomes, [{ categoryId: 'salary', currency: 'ARS', total: 500000n }]);
});

test('reports fail closed on a non-canonical month', () => {
  assert.throws(
    () => monthFlowTotals([], categories, '2026-13'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_MONTH',
  );
  assert.throws(
    () => categoryFlowTotals([], categories, 'jan', 'expense'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_MONTH',
  );
});

test('month with only transfers yields no rows', () => {
  const onlyTransfers = [
    transfer({ refs, id: 'trf1', date: TODAY, from: acct('bank-ars'), to: acct('cash-ars'), amount: money(20000n, 'ARS') }),
    transfer({ refs, id: 'trf2', date: TODAY, from: acct('cash-ars'), to: acct('bank-ars'), amount: money(10000n, 'ARS') }),
  ];
  const flows = monthFlowTotals(onlyTransfers, categories, monthOfDate(TODAY));
  assert.equal(flows.length, 0, 'transfers must not create report rows');
});

test('categoryFlowTotals returns empty for month with no categorized expenses', () => {
  const onlyIncome = [
    income({ refs, id: 'inc1', date: TODAY, account: acct('bank-ars'), amount: money(500000n, 'ARS'), category: cat('salary') }),
  ];
  const expenses = categoryFlowTotals(onlyIncome, categories, monthOfDate(TODAY), 'expense');
  assert.equal(expenses.length, 0, 'no expense category rows when no expenses');
});
