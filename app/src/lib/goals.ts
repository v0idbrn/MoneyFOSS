import type { Goal, Transaction } from '../../../src/domain/types.ts';
import { accountBalances } from '../../../src/domain/balances.ts';

export interface GoalProgress {
  readonly goal: Goal;
  readonly progress: bigint;
  readonly remaining: bigint;
  readonly percentage: number | null;
}

export function goalProgress(goal: Goal, transactions: readonly Transaction[]): GoalProgress {
  const balances = accountBalances(transactions);
  let progress = 0n;
  for (const accountId of goal.accountIds) {
    const perCurrency = balances.get(accountId);
    if (perCurrency === undefined) {
      continue;
    }
    const amount = perCurrency.get(goal.currency);
    if (amount !== undefined) {
      progress += amount;
    }
  }
  const remaining = goal.targetMinor - progress;
  const percentage = goal.targetMinor > 0n ? Number((progress * 10000n) / goal.targetMinor) / 100 : null;
  return { goal, progress, remaining, percentage };
}