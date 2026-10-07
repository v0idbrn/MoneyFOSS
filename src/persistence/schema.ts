export const SCHEMA_VERSION = 2;

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly statements: readonly string[];
}

const V1_STATEMENTS: readonly string[] = [
  `CREATE TABLE schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) > 0),
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY')),
    currency TEXT NOT NULL CHECK (length(currency) > 0),
    archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
  )`,
  `CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(name) > 0),
    kind TEXT NOT NULL CHECK (kind IN ('income', 'expense'))
  )`,
  `CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL CHECK (length(date) > 0),
    memo TEXT
  )`,
  `CREATE TABLE conversions (
    transaction_id TEXT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    from_currency TEXT NOT NULL CHECK (length(from_currency) > 0),
    to_currency TEXT NOT NULL CHECK (length(to_currency) > 0),
    rate_text TEXT NOT NULL CHECK (length(rate_text) > 0),
    rate_num TEXT NOT NULL CHECK (length(rate_num) > 0),
    rate_den TEXT NOT NULL CHECK (length(rate_den) > 0),
    quote_direction TEXT NOT NULL CHECK (quote_direction IN ('srcPerDest', 'destPerSrc')),
    rate_at TEXT NOT NULL CHECK (length(rate_at) > 0),
    source TEXT NOT NULL CHECK (source IN ('manual', 'institution', 'file')),
    rounding_mode TEXT NOT NULL CHECK (rounding_mode IN ('half-away-from-zero', 'half-even', 'truncate'))
  )`,
  `CREATE TABLE postings (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 0),
    account_id TEXT NOT NULL CHECK (length(account_id) > 0),
    currency TEXT NOT NULL CHECK (length(currency) > 0),
    amount TEXT NOT NULL CHECK (length(amount) > 0),
    kind TEXT NOT NULL CHECK (kind IN ('normal', 'bridge')),
    category_id TEXT REFERENCES categories(id),
    UNIQUE (transaction_id, position)
  )`,
];

const V2_STATEMENTS: readonly string[] = [
  `CREATE TABLE budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    currency TEXT NOT NULL CHECK (length(currency) > 0),
    amount_minor TEXT NOT NULL CHECK (amount_minor GLOB '[1-9]*' AND amount_minor NOT GLOB '*[^0-9]*'),
    UNIQUE (category_id, currency)
  )`,
];

export const MIGRATIONS: readonly Migration[] = [
  { version: 1, name: 'initial-ledger-schema', statements: V1_STATEMENTS },
  { version: 2, name: 'budgets-table', statements: V2_STATEMENTS },
];
