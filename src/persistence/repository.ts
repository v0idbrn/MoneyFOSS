import { DomainError } from '../domain/errors.ts';
import { getCurrency } from '../domain/currency.ts';
import { assertInt64 } from '../domain/money.ts';
import { ID_MAX_LENGTH, assertTransaction } from '../domain/validate.ts';
import type { Db, DbRow } from './db.ts';
import type { Account, Budget, Category, Conversion, LedgerRefs, Posting, Transaction } from '../domain/types.ts';
import { budgetId } from '../domain/types.ts';

const CANONICAL_INT_RE = /^-?(0|[1-9]\d*)$/;
const POSITIVE_INT_RE = /^[1-9]\d*$/;
const ACCOUNT_TYPES: readonly string[] = ['ASSET', 'LIABILITY', 'EQUITY'];
const CATEGORY_KINDS: readonly string[] = ['income', 'expense'];

function rowString(row: DbRow, column: string, what: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new DomainError('CORRUPT_ROW', `${what}: column ${column} expected TEXT, got ${value === null ? 'NULL' : typeof value}`);
  }
  return value;
}

function rowStringOrNull(row: DbRow, column: string, what: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new DomainError('CORRUPT_ROW', `${what}: column ${column} expected TEXT or NULL, got ${typeof value}`);
  }
  return value;
}

function parseCanonicalAmount(text: string, what: string): bigint {
  if (!CANONICAL_INT_RE.test(text)) {
    throw new DomainError('CORRUPT_ROW', `${what}: amount is not a canonical integer string of minor units: ${JSON.stringify(text)}`);
  }
  const amount = BigInt(text);
  assertInt64(amount, what);
  return amount;
}

function parsePositiveInt(text: string, what: string): bigint {
  if (!POSITIVE_INT_RE.test(text)) {
    throw new DomainError('CORRUPT_ROW', `${what}: expected a positive integer string, got ${JSON.stringify(text)}`);
  }
  return BigInt(text);
}

function checkId(id: string, what: string): void {
  if (typeof id !== 'string' || id.length === 0 || id.length > ID_MAX_LENGTH) {
    throw new DomainError(what, `id must be a non-empty string of at most ${ID_MAX_LENGTH} characters`);
  }
}

export function saveAccount(db: Db, account: Account): void {
  checkId(account.id, 'INVALID_ACCOUNT');
  if (account.id.startsWith('sys:')) {
    throw new DomainError('INVALID_ACCOUNT', `account ${JSON.stringify(account.id)} uses reserved namespace`);
  }
  if (typeof account.name !== 'string' || account.name.length === 0) {
    throw new DomainError('INVALID_ACCOUNT', `account ${JSON.stringify(account.id)} must have a non-empty name`);
  }
  if (!ACCOUNT_TYPES.includes(account.type)) {
    throw new DomainError('INVALID_ACCOUNT', `account ${JSON.stringify(account.id)} has unknown type ${JSON.stringify(String(account.type))}`);
  }
  getCurrency(account.currency);
  if (db.query('SELECT id FROM accounts WHERE id = ?', [account.id]).length > 0) {
    throw new DomainError('DUPLICATE_ACCOUNT_ID', `account ${JSON.stringify(account.id)} already exists`);
  }
  db.exec('INSERT INTO accounts (id, name, type, currency, archived) VALUES (?, ?, ?, ?, 0)', [
    account.id,
    account.name,
    account.type,
    account.currency,
  ]);
}

export function saveCategory(db: Db, category: Category): void {
  checkId(category.id, 'INVALID_CATEGORY');
  if (typeof category.name !== 'string' || category.name.length === 0) {
    throw new DomainError('INVALID_CATEGORY', `category ${JSON.stringify(category.id)} must have a non-empty name`);
  }
  if (!CATEGORY_KINDS.includes(category.kind)) {
    throw new DomainError('INVALID_CATEGORY', `category ${JSON.stringify(category.id)} has unknown kind ${JSON.stringify(String(category.kind))}`);
  }
  if (db.query('SELECT id FROM categories WHERE id = ?', [category.id]).length > 0) {
    throw new DomainError('DUPLICATE_CATEGORY_ID', `category ${JSON.stringify(category.id)} already exists`);
  }
  db.exec('INSERT INTO categories (id, name, kind) VALUES (?, ?, ?)', [category.id, category.name, category.kind]);
}

export function saveBudget(db: Db, budget: Budget): void {
  checkId(budget.id, 'INVALID_BUDGET');
  if (typeof budget.categoryId !== 'string' || budget.categoryId.length === 0) {
    throw new DomainError('INVALID_BUDGET', `budget ${JSON.stringify(budget.id)} must reference a non-empty category_id`);
  }
  if (db.query('SELECT id FROM categories WHERE id = ?', [budget.categoryId]).length === 0) {
    throw new DomainError('UNKNOWN_CATEGORY', `budget ${JSON.stringify(budget.id)} references unknown category ${JSON.stringify(budget.categoryId)}`);
  }
  getCurrency(budget.currency);
  if (typeof budget.amountMinor !== 'bigint' || budget.amountMinor <= 0n) {
    throw new DomainError('INVALID_BUDGET', `budget ${JSON.stringify(budget.id)} amount must be a positive integer of minor units, got ${String(budget.amountMinor)}`);
  }
  assertInt64(budget.amountMinor, `budget ${budget.id} amount`);
  if (budget.id !== budgetId(budget.categoryId, budget.currency)) {
    throw new DomainError('INVALID_BUDGET', `budget id ${JSON.stringify(budget.id)} must be ${JSON.stringify(budgetId(budget.categoryId, budget.currency))} (one rule per category+currency)`);
  }
  db.exec('INSERT OR REPLACE INTO budgets (id, category_id, currency, amount_minor) VALUES (?, ?, ?, ?)', [
    budget.id,
    budget.categoryId,
    budget.currency,
    budget.amountMinor.toString(),
  ]);
}

function mapAccount(row: DbRow): Account {
  const type = rowString(row, 'type', 'accounts');
  if (!ACCOUNT_TYPES.includes(type)) {
    throw new DomainError('CORRUPT_ROW', `accounts row has unknown type: ${JSON.stringify(type)}`);
  }
  return {
    id: rowString(row, 'id', 'accounts'),
    name: rowString(row, 'name', 'accounts'),
    type: type as Account['type'],
    currency: rowString(row, 'currency', 'accounts'),
  };
}

function mapCategory(row: DbRow): Category {
  const kind = rowString(row, 'kind', 'categories');
  if (!CATEGORY_KINDS.includes(kind)) {
    throw new DomainError('CORRUPT_ROW', `categories row has unknown kind: ${JSON.stringify(kind)}`);
  }
  return {
    id: rowString(row, 'id', 'categories'),
    name: rowString(row, 'name', 'categories'),
    kind: kind as Category['kind'],
  };
}

export function listAccounts(db: Db): Account[] {
  return db.query('SELECT id, name, type, currency FROM accounts ORDER BY rowid').map(mapAccount);
}

export function listCategories(db: Db): Category[] {
  return db.query('SELECT id, name, kind FROM categories ORDER BY rowid').map(mapCategory);
}

function mapBudget(row: DbRow): Budget {
  const amount = parsePositiveInt(rowString(row, 'amount_minor', 'budgets'), 'budgets.amount_minor');
  assertInt64(amount, 'budgets.amount_minor');
  return {
    id: rowString(row, 'id', 'budgets'),
    categoryId: rowString(row, 'category_id', 'budgets'),
    currency: rowString(row, 'currency', 'budgets'),
    amountMinor: amount,
  };
}

export function listBudgets(db: Db): Budget[] {
  return db.query('SELECT id, category_id, currency, amount_minor FROM budgets ORDER BY rowid').map(mapBudget);
}

export function deleteBudget(db: Db, id: string): void {
  const rows = db.query('SELECT id FROM budgets WHERE id = ?', [id]);
  if (rows.length === 0) {
    throw new DomainError('UNKNOWN_BUDGET', `budget ${JSON.stringify(id)} not found`);
  }
  db.exec('DELETE FROM budgets WHERE id = ?', [id]);
}

export function loadRefs(db: Db): LedgerRefs {
  const accounts = new Map<string, Account>();
  for (const account of listAccounts(db)) {
    accounts.set(account.id, account);
  }
  const categories = new Map<string, Category>();
  for (const category of listCategories(db)) {
    categories.set(category.id, category);
  }
  return { accounts, categories };
}

export function saveTransaction(db: Db, tx: Transaction): void {
  const refs = loadRefs(db);
  assertTransaction(tx, refs);
  if (db.query('SELECT id FROM transactions WHERE id = ?', [tx.id]).length > 0) {
    throw new DomainError('DUPLICATE_TRANSACTION_ID', `transaction ${JSON.stringify(tx.id)} already exists`);
  }
  db.transaction(() => {
    db.exec('INSERT INTO transactions (id, date, memo) VALUES (?, ?, ?)', [tx.id, tx.date, tx.memo ?? null]);
    if (tx.conversion !== undefined) {
      const conversion = tx.conversion;
      db.exec(
        'INSERT INTO conversions (transaction_id, from_currency, to_currency, rate_text, rate_num, rate_den, quote_direction, rate_at, source, rounding_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          tx.id,
          conversion.fromCurrency,
          conversion.toCurrency,
          conversion.rateText,
          conversion.rateRatio.num.toString(),
          conversion.rateRatio.den.toString(),
          conversion.quoteDirection,
          conversion.rateAt,
          conversion.source,
          conversion.roundingMode,
        ],
      );
    }
    tx.postings.forEach((posting, index) => {
      db.exec(
        'INSERT INTO postings (id, transaction_id, position, account_id, currency, amount, kind, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `${tx.id}:p${index}`,
          tx.id,
          index,
          posting.accountId,
          posting.currency,
          posting.amount.toString(),
          posting.kind,
          posting.categoryId ?? null,
        ],
      );
    });
  });
}

function mapConversion(row: DbRow, txId: string): Conversion {
  const what = `conversion of tx ${txId}`;
  return {
    fromCurrency: rowString(row, 'from_currency', what),
    toCurrency: rowString(row, 'to_currency', what),
    rateText: rowString(row, 'rate_text', what),
    rateRatio: {
      num: parsePositiveInt(rowString(row, 'rate_num', what), `${what}.rate_num`),
      den: parsePositiveInt(rowString(row, 'rate_den', what), `${what}.rate_den`),
    },
    quoteDirection: rowString(row, 'quote_direction', what) as Conversion['quoteDirection'],
    rateAt: rowString(row, 'rate_at', what),
    source: rowString(row, 'source', what) as Conversion['source'],
    roundingMode: rowString(row, 'rounding_mode', what) as Conversion['roundingMode'],
  };
}

function mapPosting(row: DbRow, txId: string, index: number): Posting {
  const what = `posting ${index} of tx ${txId}`;
  const category = rowStringOrNull(row, 'category_id', what);
  return {
    accountId: rowString(row, 'account_id', what),
    currency: rowString(row, 'currency', what),
    amount: parseCanonicalAmount(rowString(row, 'amount', what), what),
    kind: rowString(row, 'kind', what) as Posting['kind'],
    ...(category !== null ? { categoryId: category } : {}),
  };
}

export function loadTransaction(db: Db, id: string): Transaction {
  const txRows = db.query('SELECT id, date, memo FROM transactions WHERE id = ?', [id]);
  const txRow = txRows[0];
  if (txRow === undefined) {
    throw new DomainError('TRANSACTION_NOT_FOUND', `transaction ${JSON.stringify(id)} not found`);
  }
  const postingRows = db.query(
    'SELECT account_id, currency, amount, kind, category_id FROM postings WHERE transaction_id = ? ORDER BY position',
    [id],
  );
  const postings = postingRows.map((row, index) => mapPosting(row, id, index));
  const convRows = db.query(
    'SELECT from_currency, to_currency, rate_text, rate_num, rate_den, quote_direction, rate_at, source, rounding_mode FROM conversions WHERE transaction_id = ?',
    [id],
  );
  const convRow = convRows[0];
  const conversion = convRow === undefined ? undefined : mapConversion(convRow, id);
  const memo = rowStringOrNull(txRow, 'memo', `tx ${id}`);
  const tx: Transaction = {
    id: rowString(txRow, 'id', `tx ${id}`),
    date: rowString(txRow, 'date', `tx ${id}`),
    postings,
    ...(conversion !== undefined ? { conversion } : {}),
    ...(memo !== null ? { memo } : {}),
  };
  return assertTransaction(tx, loadRefs(db));
}

export function listTransactions(db: Db): Transaction[] {
  const rows = db.query('SELECT id FROM transactions ORDER BY rowid');
  return rows.map((row) => loadTransaction(db, rowString(row, 'id', 'transactions')));
}

export function hasPostings(db: Db, accountId: string): boolean {
  const rows = db.query('SELECT 1 FROM postings WHERE account_id = ? LIMIT 1', [accountId]);
  return rows.length > 0;
}

export function deleteAccount(db: Db, accountId: string): void {
  if (hasPostings(db, accountId)) {
    throw new DomainError('ACCOUNT_HAS_POSTINGS', `account ${JSON.stringify(accountId)} has postings and cannot be deleted`);
  }
  const rows = db.query('SELECT id FROM accounts WHERE id = ?', [accountId]);
  if (rows.length === 0) {
    throw new DomainError('UNKNOWN_ACCOUNT', `account ${JSON.stringify(accountId)} not found`);
  }
  db.exec('DELETE FROM accounts WHERE id = ?', [accountId]);
}

export function renameAccount(db: Db, accountId: string, name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new DomainError('INVALID_ACCOUNT', 'account name must be a non-empty string');
  }
  const rows = db.query('SELECT id FROM accounts WHERE id = ?', [accountId]);
  if (rows.length === 0) {
    throw new DomainError('UNKNOWN_ACCOUNT', `account ${JSON.stringify(accountId)} not found`);
  }
  db.exec('UPDATE accounts SET name = ? WHERE id = ?', [name, accountId]);
}

export function hasCategoryUse(db: Db, categoryId: string): boolean {
  const rows = db.query('SELECT 1 FROM postings WHERE category_id = ? LIMIT 1', [categoryId]);
  return rows.length > 0;
}

export function deleteCategory(db: Db, categoryId: string): void {
  if (hasCategoryUse(db, categoryId)) {
    throw new DomainError('CATEGORY_IN_USE', `category ${JSON.stringify(categoryId)} is used by postings and cannot be deleted`);
  }
  const rows = db.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
  if (rows.length === 0) {
    throw new DomainError('UNKNOWN_CATEGORY', `category ${JSON.stringify(categoryId)} not found`);
  }
  db.exec('DELETE FROM categories WHERE id = ?', [categoryId]);
}

export function renameCategory(db: Db, categoryId: string, name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new DomainError('INVALID_CATEGORY', 'category name must be a non-empty string');
  }
  const rows = db.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
  if (rows.length === 0) {
    throw new DomainError('UNKNOWN_CATEGORY', `category ${JSON.stringify(categoryId)} not found`);
  }
  db.exec('UPDATE categories SET name = ? WHERE id = ?', [name, categoryId]);
}

export function deleteTransaction(db: Db, id: string): void {
  const rows = db.query('SELECT id FROM transactions WHERE id = ?', [id]);
  if (rows.length === 0) {
    throw new DomainError('TRANSACTION_NOT_FOUND', `transaction ${JSON.stringify(id)} not found`);
  }
  db.transaction(() => {
    db.exec('DELETE FROM postings WHERE transaction_id = ?', [id]);
    db.exec('DELETE FROM conversions WHERE transaction_id = ?', [id]);
    db.exec('DELETE FROM transactions WHERE id = ?', [id]);
  });
}

export function getSetting(db: Db, key: string): string | null {
  const rows = db.query('SELECT value FROM schema_meta WHERE key = ?', [key]);
  const value = rows[0]?.value;
  return typeof value === 'string' ? value : null;
}

export function setSetting(db: Db, key: string, value: string): void {
  if (typeof key !== 'string' || key.length === 0 || key.length > ID_MAX_LENGTH) {
    throw new DomainError('INVALID_SETTING', 'setting key must be a non-empty string of at most 128 characters');
  }
  if (key === 'version') {
    throw new DomainError('INVALID_SETTING', 'the schema version key is owned by migrations');
  }
  if (typeof value !== 'string') {
    throw new DomainError('INVALID_SETTING', 'setting value must be a string');
  }
  db.exec('INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)', [key, value]);
}
