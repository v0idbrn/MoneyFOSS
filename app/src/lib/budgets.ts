import { DomainError } from '../../../src/domain/errors.ts';
import type { Budget, Transaction } from '../../../src/domain/types.ts';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(month: string): boolean {
  return MONTH_RE.test(month);
}

export interface BudgetProgress {
  readonly budget: Budget;
  readonly spent: bigint;
  readonly remaining: bigint;
}

export function monthOfDate(date: string): string {
  return date.slice(0, 7);
}

export function budgetProgress(budget: Budget, transactions: readonly Transaction[], month: string, kind: 'income' | 'expense'): BudgetProgress {
  if (!MONTH_RE.test(month)) {
    throw new DomainError('INVALID_BUDGET', `month must be a canonical YYYY-MM string, got ${JSON.stringify(month)}`);
  }
  let measured = 0n;
  for (const tx of transactions) {
    if (monthOfDate(tx.date) !== month) {
      continue;
    }
    for (const posting of tx.postings) {
      if (posting.kind === 'normal' && posting.categoryId === budget.categoryId && posting.currency === budget.currency) {
        measured += posting.amount;
      }
    }
  }
  const spent = kind === 'income' ? -measured : measured;
  return { budget, spent, remaining: budget.amountMinor - spent };
}
