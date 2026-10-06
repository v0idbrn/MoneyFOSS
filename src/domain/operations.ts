import { DomainError } from './errors.ts';
import { DEFAULT_ROUNDING, parseRatio, type Money, type RoundingMode } from './money.ts';
import {
  SYSTEM_EXPENSE_ID,
  SYSTEM_INCOME_ID,
  fxAccountId,
  deriveConversionDest,
  type Account,
  type Category,
  type Conversion,
  type LedgerRefs,
  type Posting,
  type QuoteDirection,
  type RateSource,
  type Transaction,
} from './types.ts';
import { assertTransaction } from './validate.ts';

export interface RateInput {
  readonly text: string;
  readonly quoteDirection: QuoteDirection;
  readonly rateAt: string;
  readonly source: RateSource;
  readonly roundingMode?: RoundingMode;
}

export interface BaseInput {
  readonly id: string;
  readonly date: string;
  readonly memo?: string;
  readonly refs: LedgerRefs;
}

export interface ExpenseInput extends BaseInput {
  readonly account: Account;
  readonly amount: Money;
  readonly category: Category;
  readonly rate?: RateInput;
}

export interface IncomeInput extends BaseInput {
  readonly account: Account;
  readonly amount: Money;
  readonly category: Category;
}

export interface TransferInput extends BaseInput {
  readonly from: Account;
  readonly to: Account;
  readonly amount: Money;
}

export interface ExchangeInput extends BaseInput {
  readonly from: Account;
  readonly to: Account;
  readonly amount: Money;
  readonly rate: RateInput;
  readonly fee?: { readonly amount: Money; readonly category: Category };
}

function finish(
  input: { id: string; date: string; memo?: string; postings: readonly Posting[]; conversion?: Conversion },
  refs: LedgerRefs,
): Transaction {
  const tx: Transaction = {
    id: input.id,
    date: input.date,
    postings: input.postings,
    ...(input.conversion !== undefined ? { conversion: input.conversion } : {}),
    ...(input.memo !== undefined ? { memo: input.memo } : {}),
  };
  return assertTransaction(tx, refs);
}

function requirePositive(amount: Money, what: string): void {
  if (amount.amount <= 0n) {
    throw new DomainError('AMOUNT_MUST_BE_POSITIVE', `${what} must be a positive amount, got ${amount.amount} minor units ${amount.currency}`);
  }
}

function requireCategoryKind(category: Category, expected: 'income' | 'expense'): void {
  if (category.kind !== expected) {
    throw new DomainError(
      'CATEGORY_KIND_MISMATCH',
      `category ${JSON.stringify(category.id)} is ${category.kind}; this operation requires an ${expected} category`,
    );
  }
}

function makeConversion(fromCurrency: string, toCurrency: string, rate: RateInput): Conversion {
  const mode = rate.roundingMode ?? DEFAULT_ROUNDING;
  return {
    fromCurrency,
    toCurrency,
    rateText: rate.text,
    rateRatio: parseRatio(rate.text),
    quoteDirection: rate.quoteDirection,
    rateAt: rate.rateAt,
    source: rate.source,
    roundingMode: mode,
  };
}

function deriveDest(conv: Conversion, srcMinor: bigint): bigint {
  const dest = deriveConversionDest(conv, srcMinor);
  if (dest <= 0n) {
    throw new DomainError(
      'DEGENERATE_CONVERSION',
      `rate ${JSON.stringify(conv.rateText)} converts ${srcMinor} minor units ${conv.fromCurrency} to ${dest} minor units ${conv.toCurrency}; the destination amount would be zero, use a smaller rate or a larger amount`,
    );
  }
  return dest;
}

export function expense(input: ExpenseInput): Transaction {
  requirePositive(input.amount, 'expense amount');
  requireCategoryKind(input.category, 'expense');

  const postings: Posting[] = [];
  let conversion: Conversion | undefined;

  if (input.rate === undefined) {
    if (input.account.currency !== input.amount.currency) {
      throw new DomainError(
        'CROSS_CURRENCY_REQUIRES_RATE',
        `expense account ${JSON.stringify(input.account.id)} is ${input.account.currency} but the amount is ${input.amount.currency}; cross-currency payments need an explicit rate`,
      );
    }
    postings.push(
      { accountId: input.account.id, currency: input.amount.currency, amount: -input.amount.amount, kind: 'normal' },
      { accountId: SYSTEM_EXPENSE_ID, currency: input.amount.currency, amount: input.amount.amount, kind: 'normal', categoryId: input.category.id },
    );
  } else {
    if (input.account.currency === input.amount.currency) {
      throw new DomainError(
        'UNEXPECTED_RATE',
        `expense account ${JSON.stringify(input.account.id)} is already ${input.amount.currency}; omit the rate for same-currency payments`,
      );
    }
    conversion = makeConversion(input.amount.currency, input.account.currency, input.rate);
    const funded = deriveDest(conversion, input.amount.amount);
    postings.push(
      { accountId: SYSTEM_EXPENSE_ID, currency: input.amount.currency, amount: input.amount.amount, kind: 'normal', categoryId: input.category.id },
      { accountId: fxAccountId(input.amount.currency), currency: input.amount.currency, amount: -input.amount.amount, kind: 'bridge' },
      { accountId: fxAccountId(input.account.currency), currency: input.account.currency, amount: funded, kind: 'bridge' },
      { accountId: input.account.id, currency: input.account.currency, amount: -funded, kind: 'normal' },
    );
  }

  return finish({ id: input.id, date: input.date, memo: input.memo, postings, conversion }, input.refs);
}

export function income(input: IncomeInput): Transaction {
  requirePositive(input.amount, 'income amount');
  requireCategoryKind(input.category, 'income');
  if (input.account.currency !== input.amount.currency) {
    throw new DomainError(
      'CROSS_CURRENCY_REQUIRES_RATE',
      `income account ${JSON.stringify(input.account.id)} is ${input.account.currency} but the amount is ${input.amount.currency}; record an exchange() into the account first`,
    );
  }
  const postings: Posting[] = [
    { accountId: input.account.id, currency: input.amount.currency, amount: input.amount.amount, kind: 'normal' },
    { accountId: SYSTEM_INCOME_ID, currency: input.amount.currency, amount: -input.amount.amount, kind: 'normal', categoryId: input.category.id },
  ];
  return finish({ id: input.id, date: input.date, memo: input.memo, postings }, input.refs);
}

export function transfer(input: TransferInput): Transaction {
  requirePositive(input.amount, 'transfer amount');
  if (input.from.id === input.to.id) {
    throw new DomainError('SAME_ACCOUNT_TRANSFER', `transfer source and destination are the same account ${JSON.stringify(input.from.id)}`);
  }
  if (input.from.currency !== input.to.currency) {
    throw new DomainError(
      'CROSS_CURRENCY_REQUIRES_RATE',
      `transfer from ${JSON.stringify(input.from.id)} (${input.from.currency}) to ${JSON.stringify(input.to.id)} (${input.to.currency}) crosses currencies; use exchange() to convert with an explicit rate`,
    );
  }
  const postings: Posting[] = [
    { accountId: input.from.id, currency: input.amount.currency, amount: -input.amount.amount, kind: 'normal' },
    { accountId: input.to.id, currency: input.amount.currency, amount: input.amount.amount, kind: 'normal' },
  ];
  return finish({ id: input.id, date: input.date, memo: input.memo, postings }, input.refs);
}

export function cardPurchase(input: ExpenseInput): Transaction {
  if (input.account.type !== 'LIABILITY') {
    throw new DomainError(
      'ACCOUNT_TYPE_MISMATCH',
      `cardPurchase requires a LIABILITY account, ${JSON.stringify(input.account.id)} is ${input.account.type}`,
    );
  }
  return expense(input);
}

export function cardPayment(input: TransferInput): Transaction {
  if (input.to.type !== 'LIABILITY') {
    throw new DomainError(
      'ACCOUNT_TYPE_MISMATCH',
      `cardPayment destination must be the LIABILITY card account, ${JSON.stringify(input.to.id)} is ${input.to.type}`,
    );
  }
  return transfer(input);
}

export interface OpeningBalanceInput extends BaseInput {
  readonly account: Account;
  readonly amount: Money;
  readonly equityAccount: Account;
}

export function openingBalance(input: OpeningBalanceInput): Transaction {
  requirePositive(input.amount, 'opening balance');
  if (input.equityAccount.type !== 'EQUITY') {
    throw new DomainError(
      'ACCOUNT_TYPE_MISMATCH',
      `opening balance counterpart must be an EQUITY account, ${JSON.stringify(input.equityAccount.id)} is ${input.equityAccount.type}`,
    );
  }
  if (input.account.type !== 'ASSET' && input.account.type !== 'LIABILITY') {
    throw new DomainError(
      'ACCOUNT_TYPE_MISMATCH',
      `opening balance account must be ASSET or LIABILITY, ${JSON.stringify(input.account.id)} is ${input.account.type}`,
    );
  }
  const postings: Posting[] = [
    { accountId: input.account.id, currency: input.amount.currency, amount: input.amount.amount, kind: 'normal' },
    { accountId: input.equityAccount.id, currency: input.amount.currency, amount: -input.amount.amount, kind: 'normal' },
  ];
  return finish({ id: input.id, date: input.date, memo: input.memo, postings }, input.refs);
}

export function exchange(input: ExchangeInput): Transaction {
  requirePositive(input.amount, 'exchange amount');
  if (input.from.currency !== input.amount.currency) {
    throw new DomainError(
      'CURRENCY_MISMATCH',
      `exchange source account ${JSON.stringify(input.from.id)} is ${input.from.currency} but the amount is ${input.amount.currency}`,
    );
  }
  if (input.from.currency === input.to.currency) {
    throw new DomainError(
      'SAME_CURRENCY_EXCHANGE',
      `exchange source and destination are both ${input.from.currency}; use transfer() for same-currency movement`,
    );
  }

  const conversion = makeConversion(input.from.currency, input.to.currency, input.rate);
  const postings: Posting[] = [];
  const fee = input.fee;

  if (fee === undefined) {
    const dest = deriveDest(conversion, input.amount.amount);
    postings.push(
      { accountId: input.from.id, currency: input.from.currency, amount: -input.amount.amount, kind: 'normal' },
      { accountId: fxAccountId(input.from.currency), currency: input.from.currency, amount: input.amount.amount, kind: 'bridge' },
      { accountId: fxAccountId(input.to.currency), currency: input.to.currency, amount: -dest, kind: 'bridge' },
      { accountId: input.to.id, currency: input.to.currency, amount: dest, kind: 'normal' },
    );
  } else {
    requirePositive(fee.amount, 'fee amount');
    requireCategoryKind(fee.category, 'expense');
    if (fee.amount.currency !== input.from.currency && fee.amount.currency !== input.to.currency) {
      throw new DomainError(
        'FEE_CURRENCY_MISMATCH',
        `fee currency ${fee.amount.currency} must be either ${input.from.currency} or ${input.to.currency}`,
      );
    }

    if (fee.amount.currency === input.from.currency) {
      if (fee.amount.amount >= input.amount.amount) {
        throw new DomainError(
          'FEE_EXCEEDS_AMOUNT',
          `fee ${fee.amount.amount} minor units ${fee.amount.currency} must be smaller than the exchanged amount ${input.amount.amount}`,
        );
      }
      const net = input.amount.amount - fee.amount.amount;
      const dest = deriveDest(conversion, net);
      postings.push(
        { accountId: input.from.id, currency: input.from.currency, amount: -input.amount.amount, kind: 'normal' },
        { accountId: SYSTEM_EXPENSE_ID, currency: input.from.currency, amount: fee.amount.amount, kind: 'normal', categoryId: fee.category.id },
        { accountId: fxAccountId(input.from.currency), currency: input.from.currency, amount: net, kind: 'bridge' },
        { accountId: fxAccountId(input.to.currency), currency: input.to.currency, amount: -dest, kind: 'bridge' },
        { accountId: input.to.id, currency: input.to.currency, amount: dest, kind: 'normal' },
      );
    } else {
      const dest = deriveDest(conversion, input.amount.amount);
      if (fee.amount.amount >= dest) {
        throw new DomainError(
          'FEE_EXCEEDS_AMOUNT',
          `fee ${fee.amount.amount} minor units ${fee.amount.currency} must be smaller than the converted amount ${dest}`,
        );
      }
      postings.push(
        { accountId: input.from.id, currency: input.from.currency, amount: -input.amount.amount, kind: 'normal' },
        { accountId: fxAccountId(input.from.currency), currency: input.from.currency, amount: input.amount.amount, kind: 'bridge' },
        { accountId: fxAccountId(input.to.currency), currency: input.to.currency, amount: -dest, kind: 'bridge' },
        { accountId: input.to.id, currency: input.to.currency, amount: dest - fee.amount.amount, kind: 'normal' },
        { accountId: SYSTEM_EXPENSE_ID, currency: input.to.currency, amount: fee.amount.amount, kind: 'normal', categoryId: fee.category.id },
      );
    }
  }

  return finish({ id: input.id, date: input.date, memo: input.memo, postings, conversion }, input.refs);
}

export function buildTransaction(
  input: {
    readonly id: string;
    readonly date: string;
    readonly memo?: string;
    readonly postings: readonly Posting[];
    readonly conversion?: Conversion;
    readonly refs: LedgerRefs;
  },
): Transaction {
  return finish(
    { id: input.id, date: input.date, memo: input.memo, postings: input.postings, conversion: input.conversion },
    input.refs,
  );
}
