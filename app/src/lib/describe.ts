import { SYSTEM_EXPENSE_ID, SYSTEM_INCOME_ID } from '../../../src/domain/types.ts';
import type { Account, Category, Transaction } from '../../../src/domain/types.ts';
import { displayCategoryName } from './categories.ts';
import type { Dict } from '../i18n.ts';

export type TxKind = 'expense' | 'income' | 'transfer' | 'card-payment' | 'conversion';

export const TX_KINDS: readonly TxKind[] = ['expense', 'income', 'transfer', 'card-payment', 'conversion'];

export interface TxAmountLine {
  readonly amount: bigint;
  readonly currency: string;
}

export interface TxView {
  readonly kind: TxKind;
  readonly title: string;
  readonly detail: string;
  readonly amounts: readonly TxAmountLine[];
  readonly hasFee: boolean;
}

function accountName(accounts: ReadonlyMap<string, Account>, id: string): string {
  return accounts.get(id)?.name ?? id;
}

export function describeTransaction(
  tx: Transaction,
  accounts: ReadonlyMap<string, Account>,
  categories: ReadonlyMap<string, Category>,
  t?: Dict,
): TxView {
  const valuePostings = tx.postings.filter((posting) => posting.kind === 'normal' && accounts.has(posting.accountId));
  const amounts: TxAmountLine[] = valuePostings.map((posting) => ({ amount: posting.amount, currency: posting.currency }));

  if (tx.conversion !== undefined) {
    const conversion = tx.conversion;
    const fee = tx.postings.some(
      (posting) => posting.kind === 'normal' && posting.accountId === SYSTEM_EXPENSE_ID,
    );
    return {
      kind: 'conversion',
      title: `${conversion.fromCurrency} → ${conversion.toCurrency}`,
      detail: `Rate ${conversion.rateText}${fee ? ' · with fee' : ''}`,
      amounts,
      hasFee: fee,
    };
  }

  const expensePosting = tx.postings.find((posting) => posting.accountId === SYSTEM_EXPENSE_ID);
  if (expensePosting !== undefined) {
    const stored = expensePosting.categoryId !== undefined ? categories.get(expensePosting.categoryId) : undefined;
    const category = stored !== undefined && t !== undefined ? displayCategoryName(stored, t) : stored?.name;
    const where = valuePostings.map((posting) => accountName(accounts, posting.accountId)).join(', ');
    return {
      kind: 'expense',
      title: category ?? 'Expense',
      detail: where,
      amounts,
      hasFee: false,
    };
  }

  const incomePosting = tx.postings.find((posting) => posting.accountId === SYSTEM_INCOME_ID);
  if (incomePosting !== undefined) {
    const stored = incomePosting.categoryId !== undefined ? categories.get(incomePosting.categoryId) : undefined;
    const category = stored !== undefined && t !== undefined ? displayCategoryName(stored, t) : stored?.name;
    const where = valuePostings.map((posting) => accountName(accounts, posting.accountId)).join(', ');
    return {
      kind: 'income',
      title: category ?? 'Income',
      detail: where,
      amounts,
      hasFee: false,
    };
  }

  const from = valuePostings.find((posting) => posting.amount < 0n);
  const to = valuePostings.find((posting) => posting.amount > 0n);
  const title =
    from !== undefined && to !== undefined
      ? `${accountName(accounts, from.accountId)} → ${accountName(accounts, to.accountId)}`
      : 'Transfer';
  const destination = to !== undefined ? accounts.get(to.accountId) : undefined;
  return {
    kind: destination?.type === 'LIABILITY' ? 'card-payment' : 'transfer',
    title,
    detail: destination?.type === 'LIABILITY' ? 'Credit card payment' : 'Transfer between accounts',
    amounts,
    hasFee: false,
  };
}
