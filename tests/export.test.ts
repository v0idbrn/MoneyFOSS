import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../src/domain/errors.ts';
import { expense, exchange, income, transfer } from '../src/domain/operations.ts';
import { fromWire, stableStringify, toWire } from '../src/domain/serialize.ts';
import { money } from '../src/domain/money.ts';
import { CSV_MAX_INPUT, parseCsv, toCsv, toCsvCell } from '../app/src/lib/csv.ts';
import { JSON_EXPORT_FORMAT, JSON_EXPORT_VERSION, TRANSACTIONS_CSV_HEADER, exportJson, transactionsCsv } from '../app/src/lib/export-data.ts';
import { RATE_1180, TODAY, acct, cat, refs } from './fixtures.ts';
import type { Account, Budget, Category, Goal, LedgerRefs, Transaction } from '../src/domain/types.ts';
import { budgetId } from '../src/domain/types.ts';

function demoTransactions(): Transaction[] {
  return [
    expense({ refs, id: 'exp1', date: TODAY, account: acct('bank-ars'), amount: money(125099n, 'ARS'), category: cat('food'), memo: 'Almuerzo, con "amigos"' }),
    income({ refs, id: 'inc1', date: TODAY, account: acct('bank-ars'), amount: money(500000n, 'ARS'), category: cat('salary') }),
    transfer({ refs, id: 'trf1', date: TODAY, from: acct('bank-ars'), to: acct('cash-ars'), amount: money(20000n, 'ARS') }),
    exchange({ refs, id: 'exg1', date: TODAY, from: acct('bank-ars'), to: acct('bank-usd'), amount: money(10000000n, 'ARS'), rate: RATE_1180 }),
  ];
}

function refsFrom(accounts: readonly Account[], categories: readonly Category[]): LedgerRefs {
  return {
    accounts: new Map(accounts.map((account) => [account.id, account])),
    categories: new Map(categories.map((category) => [category.id, category])),
  };
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`missing ${what}`);
  }
  return value;
}

function column(header: readonly string[], name: string): number {
  const index = header.indexOf(name);
  assert.ok(index >= 0, `missing column ${name}`);
  return index;
}

const CONV_COLUMNS = ['conv_from', 'conv_to', 'conv_rate_text', 'conv_rate_num', 'conv_rate_den', 'conv_quote_direction', 'conv_rate_at', 'conv_source', 'conv_rounding'];

test('csv codec round-trips hostile cells and rejects malformed input', () => {
  const cells = ['plain', 'with,comma', 'with"quote', 'line1\nline2', '', '-123', ' leading space'];
  const text = toCsv([cells, ['second', 'row']]);
  assert.deepEqual(parseCsv(text), [cells, ['second', 'row']]);
  assert.equal(toCsv(parseCsv(text)), text);
  assert.equal(toCsvCell('a,b'), '"a,b"');
  assert.equal(toCsvCell('a"b'), '"a""b"');

  assert.throws(() => parseCsv('"unterminated'), (error: unknown) => error instanceof DomainError && error.code === 'CSV_INVALID');
  assert.throws(() => parseCsv('a,b\n"bad"quote,c'), (error: unknown) => error instanceof DomainError && error.code === 'CSV_INVALID');
  assert.throws(() => parseCsv('x'.repeat(CSV_MAX_INPUT + 1)), (error: unknown) => error instanceof DomainError && error.code === 'CSV_INVALID');
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(parseCsv('\uFEFFa,b\n'), [['a', 'b']], 'UTF-8 BOM from spreadsheet exports must not corrupt the header');
  assert.deepEqual(parseCsv('a\uFEFFb\n'), [['a\uFEFFb']], 'BOM only counts at the very start of the input');
});

test('transactions csv keeps amounts as signed integer minor units and resolves names', () => {
  const txs = demoTransactions();
  const csv = transactionsCsv(txs, [...refs.accounts.values()], [...refs.categories.values()]);
  const rows = parseCsv(csv);
  const header = must(rows[0], 'header row');
  assert.deepEqual(header, [...TRANSACTIONS_CSV_HEADER]);
  assert.equal(rows.length, 1 + txs.reduce((sum, tx) => sum + tx.postings.length, 0));

  const amountIndex = column(header, 'amount_minor');
  for (const row of rows.slice(1)) {
    const amount = must(row[amountIndex], 'amount cell');
    assert.match(amount, /^-?(0|[1-9]\d*)$/, `amount cell must be a canonical integer string, got ${JSON.stringify(amount)}`);
    assert.ok(!amount.includes('.') && !amount.toLowerCase().includes('e'));
  }

  const accountNameIndex = column(header, 'account_name');
  const accountIdIndex = column(header, 'account_id');
  const expenseRow = must(rows[1], 'first posting row');
  assert.equal(must(expenseRow[accountIdIndex], 'account_id'), 'bank-ars');
  assert.equal(must(expenseRow[accountNameIndex], 'account_name'), 'Bank ARS');

  const convFromIndex = column(header, 'conv_from');
  const convRateIndex = column(header, 'conv_rate_text');
  const convRow = rows.slice(1).find((row) => row[convFromIndex] !== '');
  assert.ok(convRow, 'exchange tx must carry conversion columns');
  assert.equal(convRow[convFromIndex], 'ARS');
  assert.equal(convRow[convRateIndex], '1180');

  const categoryNameIndex = column(header, 'category_name');
  const incomeRow = rows.slice(1).find((row) => row[accountIdIndex] === 'sys:income');
  assert.ok(incomeRow, 'system postings must appear with the system id as name');
  assert.equal(must(incomeRow[categoryNameIndex], 'category_name'), 'Salary');
});

test('json export declares its own format and every transaction re-validates through fromWire', () => {
  const accounts = [...refs.accounts.values()];
  const categories = [...refs.categories.values()];
  const txs = demoTransactions();
  const budgets: Budget[] = [{ id: budgetId('food', 'ARS'), categoryId: 'food', currency: 'ARS', amountMinor: 100000n }];
  const goals: Goal[] = [
    { id: 'goal-ars-vacation', name: 'Vacation', currency: 'ARS', targetMinor: 5000000n, targetDate: '2026-12-31', accountIds: ['bank-ars', 'cash-ars'] },
  ];
  const parsed = JSON.parse(exportJson(accounts, categories, txs, budgets, goals)) as {
    format: string;
    version: number;
    currencies: { code: string; exponent: number }[];
    accounts: Account[];
    categories: Category[];
    transactions: unknown[];
    budgets: { id: string; category_id: string; currency: string; amount_minor: string }[];
    goals: { id: string; name: string; currency: string; target_minor: string; target_date?: string; account_ids: string[] }[];
  };

  assert.equal(parsed.format, JSON_EXPORT_FORMAT);
  assert.equal(parsed.version, JSON_EXPORT_VERSION);
  assert.ok(parsed.currencies.some((currency) => currency.code === 'ARS' && currency.exponent === 2));
  assert.equal(parsed.accounts.length, accounts.length);
  assert.equal(parsed.categories.length, categories.length);
  assert.equal(parsed.transactions.length, txs.length);
  assert.deepEqual(parsed.budgets, [{ id: 'food@ARS', category_id: 'food', currency: 'ARS', amount_minor: '100000' }]);
  assert.deepEqual(parsed.goals, [
    { id: 'goal-ars-vacation', name: 'Vacation', currency: 'ARS', target_minor: '5000000', target_date: '2026-12-31', account_ids: ['bank-ars', 'cash-ars'] },
  ]);

  const rebuilt = refsFrom(parsed.accounts, parsed.categories);
  parsed.transactions.forEach((wire, index) => {
    const validated = fromWire(wire, rebuilt);
    assert.equal(stableStringify(toWire(validated)), stableStringify(toWire(must(txs[index], `tx ${index}`))));
  });
});

test('csv export round-trips every transaction shape through parse', () => {
  const txs = demoTransactions();
  const csv = transactionsCsv(txs, [...refs.accounts.values()], [...refs.categories.values()]);
  const rows = parseCsv(csv);
  const header = must(rows[0], 'header row');

  interface Group {
    date: string;
    memo: string;
    conv: string[] | null;
    postings: Map<string, string[]>;
  }
  const grouped = new Map<string, Group>();
  for (const row of rows.slice(1)) {
    const txId = must(row[column(header, 'tx_id')], 'tx_id');
    const date = must(row[column(header, 'date')], 'date');
    const memo = must(row[column(header, 'memo')], 'memo');
    const conv = CONV_COLUMNS.map((name) => must(row[column(header, name)], name));
    const hasConversion = conv[0] !== '';
    let group = grouped.get(txId);
    if (group === undefined) {
      group = { date, memo, conv: hasConversion ? conv : null, postings: new Map() };
      grouped.set(txId, group);
    }
    assert.equal(group.date, date);
    assert.equal(group.memo, memo);
    if (hasConversion) {
      assert.deepEqual(group.conv, conv, `conversion columns must agree across rows of tx ${txId}`);
    } else {
      assert.equal(group.conv, null, `tx ${txId} has no conversion, so conv cells must be empty on every row`);
    }
    const posting = ['account_id', 'account_type', 'currency', 'amount_minor', 'kind', 'category_id'].map((name) => must(row[column(header, name)], name));
    group.postings.set(must(row[column(header, 'position')], 'position'), [...posting, ...conv]);
  }

  assert.equal(grouped.size, txs.length);
  for (const tx of txs) {
    const group = must(grouped.get(tx.id), `group for ${tx.id}`);
    assert.equal(group.date, tx.date);
    assert.equal(group.memo, tx.memo ?? '');
    assert.equal(group.postings.size, tx.postings.length);
    if (tx.conversion !== undefined) {
      assert.ok(group.conv !== null, `tx ${tx.id} has a conversion, conv cells must be populated`);
      assert.equal(group.conv[0], tx.conversion.fromCurrency);
      assert.equal(group.conv[2], tx.conversion.rateText);
      assert.equal(group.conv[6], tx.conversion.rateAt);
    } else {
      assert.equal(group.conv, null, `tx ${tx.id} has no conversion, so conv cells must be empty`);
    }
    tx.postings.forEach((posting, position) => {
      const cells = must(group.postings.get(String(position)), `posting ${position} of ${tx.id}`);
      assert.equal(cells[0], posting.accountId);
      assert.equal(cells[2], posting.currency);
      assert.equal(cells[3], posting.amount.toString());
      assert.equal(cells[4], posting.kind);
      assert.equal(cells[5], posting.categoryId ?? '');
      if (group.conv !== null) {
        assert.deepEqual(cells.slice(6), group.conv);
      } else {
        assert.ok(cells.slice(6).every((value) => value === ''));
      }
    });
  }
});
