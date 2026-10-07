import { DomainError } from '../../../src/domain/errors.ts';
import { fromWire, stableStringify, toWire, type WirePosting, type WireTransaction } from '../../../src/domain/serialize.ts';
import { SYSTEM_INCOME_ID, type Account, type Category, type LedgerRefs, type Transaction } from '../../../src/domain/types.ts';
import type { Db } from '../../../src/persistence/db.ts';
import { saveAccount, saveCategory, saveTransaction } from '../../../src/persistence/repository.ts';
import { TRANSACTIONS_CSV_HEADER } from './export-data.ts';
import { parseCsv } from './csv.ts';

const AMOUNT_RE = /^-?(0|[1-9]\d*)$/;
const POSITION_RE = /^(0|[1-9]\d*){1,6}$/;
const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY'];
const CONV_COLUMNS = ['conv_from', 'conv_to', 'conv_rate_text', 'conv_rate_num', 'conv_rate_den', 'conv_quote_direction', 'conv_rate_at', 'conv_source', 'conv_rounding'];

export type RejectReason = 'bad-row' | 'mixed-conversion' | 'unknown-account' | 'unknown-category' | 'account-conflict' | 'category-conflict' | 'invalid-transaction';

export interface RejectedGroup {
  readonly txId: string;
  readonly row: number;
  readonly reason: RejectReason;
  readonly detail: string;
}

export interface ConflictGroup {
  readonly txId: string;
  readonly row: number;
  readonly detail: string;
}

export interface ImportPlan {
  readonly newAccounts: readonly Account[];
  readonly newCategories: readonly Category[];
  readonly newTransactions: readonly Transaction[];
  readonly duplicates: readonly string[];
  readonly conflicts: readonly ConflictGroup[];
  readonly rejected: readonly RejectedGroup[];
  readonly dataRows: number;
}

export interface ExistingState {
  readonly refs: LedgerRefs;
  readonly transactions: readonly Transaction[];
}

interface GroupRow {
  readonly position: number;
  readonly line: number;
  readonly cells: Map<string, string>;
}

interface GroupDraft {
  readonly txId: string;
  readonly row: number;
  readonly rows: GroupRow[];
  poisoned: RejectedGroup | null;
}

function wireFromGroup(group: GroupDraft): WireTransaction | { error: RejectReason; detail: string } {
  const sorted = [...group.rows].sort((a, b) => a.position - b.position);
  if (new Set(sorted.map((row) => row.position)).size !== sorted.length) {
    return { error: 'bad-row', detail: `duplicate posting position inside transaction ${JSON.stringify(group.txId)}` };
  }
  const first = sorted[0];
  if (first === undefined) {
    return { error: 'bad-row', detail: `transaction ${JSON.stringify(group.txId)} has no postings` };
  }
  const date = first.cells.get('date') ?? '';
  const memo = first.cells.get('memo') ?? '';
  const convTuple = CONV_COLUMNS.map((column) => first.cells.get(column) ?? '');

  const postings: WirePosting[] = [];
  for (const row of sorted) {
    if ((row.cells.get('date') ?? '') !== date || (row.cells.get('memo') ?? '') !== memo) {
      return { error: 'bad-row', detail: `rows of transaction ${JSON.stringify(group.txId)} disagree on date/memo` };
    }
    const rowConv = CONV_COLUMNS.map((column) => row.cells.get(column) ?? '');
    if (rowConv.some((value, index) => value !== convTuple[index])) {
      return { error: 'mixed-conversion', detail: `rows of transaction ${JSON.stringify(group.txId)} disagree on conversion cells` };
    }
    const categoryId = row.cells.get('category_id') ?? '';
    postings.push({
      accountId: row.cells.get('account_id') ?? '',
      currency: row.cells.get('currency') ?? '',
      amount: row.cells.get('amount_minor') ?? '',
      kind: row.cells.get('kind') ?? '',
      ...(categoryId !== '' ? { categoryId } : {}),
    });
  }

  const hasConversion = convTuple[0] !== '';
  if (hasConversion && convTuple.some((value) => value === '')) {
    return { error: 'mixed-conversion', detail: `transaction ${JSON.stringify(group.txId)} has partially filled conversion cells` };
  }
  const wire: WireTransaction = {
    id: group.txId,
    date,
    postings,
    ...(hasConversion
      ? {
          conversion: {
            fromCurrency: convTuple[0] ?? '',
            toCurrency: convTuple[1] ?? '',
            rateText: convTuple[2] ?? '',
            rateRatio: { num: convTuple[3] ?? '', den: convTuple[4] ?? '' },
            quoteDirection: (convTuple[5] ?? '') as 'srcPerDest' | 'destPerSrc',
            rateAt: convTuple[6] ?? '',
            source: (convTuple[7] ?? '') as 'manual' | 'institution' | 'file',
            roundingMode: (convTuple[8] ?? '') as 'half-away-from-zero' | 'half-even' | 'truncate',
          },
        }
      : {}),
    ...(memo !== '' ? { memo } : {}),
  };
  return wire;
}

function buildDefinitionMaps(
  groups: readonly GroupDraft[],
  refs: LedgerRefs,
): { accountDefs: Map<string, Account>; categoryDefs: Map<string, Category>; badAccounts: Set<string>; badCategories: Set<string> } {
  const accountDefs = new Map<string, Account>();
  const categoryDefs = new Map<string, Category>();
  const badAccounts = new Set<string>();
  const badCategories = new Set<string>();

  for (const group of groups) {
    for (const row of group.rows) {
      const accountId = row.cells.get('account_id') ?? '';
      const accountType = row.cells.get('account_type') ?? '';
      const accountName = row.cells.get('account_name') ?? '';
      if (accountId !== '' && !accountId.startsWith('sys:') && !refs.accounts.has(accountId)) {
        if (accountType !== '' && accountName !== '' && ACCOUNT_TYPES.includes(accountType)) {
          const candidate: Account = { id: accountId, name: accountName, type: accountType as Account['type'], currency: row.cells.get('currency') ?? '' };
          const known = accountDefs.get(accountId);
          if (known === undefined) {
            accountDefs.set(accountId, candidate);
          } else if (known.name !== candidate.name || known.type !== candidate.type || known.currency !== candidate.currency) {
            badAccounts.add(accountId);
          }
        }
      }

      const categoryId = row.cells.get('category_id') ?? '';
      if (categoryId !== '' && !refs.categories.has(categoryId)) {
        const categoryName = row.cells.get('category_name') ?? '';
        const kind = accountId === SYSTEM_INCOME_ID ? 'income' : 'expense';
        if (categoryName !== '') {
          const known = categoryDefs.get(categoryId);
          if (known === undefined) {
            categoryDefs.set(categoryId, { id: categoryId, name: categoryName, kind });
          } else if (known.kind !== kind) {
            badCategories.add(categoryId);
          }
        }
      }
    }
  }
  return { accountDefs, categoryDefs, badAccounts, badCategories };
}

export function planImport(text: string, existing: ExistingState): ImportPlan {
  const rows = parseCsv(text);
  const header = rows[0];
  if (header === undefined) {
    throw new DomainError('CSV_INVALID', 'empty CSV: expected a transactions header row');
  }
  if (header.length !== TRANSACTIONS_CSV_HEADER.length || header.some((name, index) => name !== TRANSACTIONS_CSV_HEADER[index])) {
    throw new DomainError('CSV_INVALID', `unexpected CSV header: expected exactly ${TRANSACTIONS_CSV_HEADER.join(',')}`);
  }
  const headerIndex = new Map(header.map((name, index) => [name, index]));
  const index = (name: string): number => headerIndex.get(name) ?? -1;

  const groups = new Map<string, GroupDraft>();
  const rejected: RejectedGroup[] = [];
  const conflicts: ConflictGroup[] = [];
  const duplicates: string[] = [];

  const poison = (txId: string, line: number, reason: RejectReason, detail: string): void => {
    const group = groups.get(txId);
    if (group === undefined) {
      groups.set(txId, { txId, row: line, rows: [], poisoned: { txId, row: line, reason, detail } });
    } else if (group.poisoned === null) {
      group.poisoned = { txId, row: line, reason, detail };
    }
  };

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const line = r + 1;
    if (row === undefined) {
      continue;
    }
    const txId = row[index('tx_id')] ?? '';
    if (row.length !== header.length) {
      const key = txId === '' ? `<row ${line}>` : txId;
      poison(key, line, 'bad-row', `row ${line} has ${row.length} cells, expected ${header.length}`);
      continue;
    }
    if (txId === '') {
      poison(`<row ${line}>`, line, 'bad-row', `row ${line}: tx_id is empty`);
      continue;
    }
    const cells = new Map<string, string>();
    header.forEach((name, column) => cells.set(name, row[column] ?? ''));
    const positionText = cells.get('position') ?? '';
    if (!POSITION_RE.test(positionText)) {
      poison(txId, line, 'bad-row', `row ${line}: position must be an integer of at most 6 digits, got ${JSON.stringify(positionText)}`);
      continue;
    }
    const amount = cells.get('amount_minor') ?? '';
    if (!AMOUNT_RE.test(amount)) {
      poison(txId, line, 'bad-row', `row ${line}: amount_minor must be a canonical signed integer string, got ${JSON.stringify(amount)}`);
      continue;
    }
    const kind = cells.get('kind') ?? '';
    if (kind !== 'normal' && kind !== 'bridge') {
      poison(txId, line, 'bad-row', `row ${line}: kind must be normal|bridge, got ${JSON.stringify(kind)}`);
      continue;
    }
    const convValues = CONV_COLUMNS.map((column) => cells.get(column) ?? '');
    const filled = convValues.filter((value) => value !== '').length;
    if (filled !== 0 && filled !== CONV_COLUMNS.length) {
      poison(txId, line, 'mixed-conversion', `row ${line}: conversion cells must be all filled or all empty`);
      continue;
    }
    const group = groups.get(txId);
    if (group === undefined) {
      groups.set(txId, { txId, row: line, rows: [{ position: Number(positionText), line, cells }], poisoned: null });
    } else if (group.poisoned === null) {
      group.rows.push({ position: Number(positionText), line, cells });
    }
  }

  const drafts = [...groups.values()];
  const { accountDefs, categoryDefs, badAccounts, badCategories } = buildDefinitionMaps(drafts.filter((group) => group.poisoned === null), existing.refs);

  const refs: LedgerRefs = {
    accounts: new Map([...existing.refs.accounts, ...accountDefs]),
    categories: new Map([...existing.refs.categories, ...categoryDefs]),
  };
  const existingById = new Map(existing.transactions.map((tx) => [tx.id, tx]));
  const accepted: Transaction[] = [];

  for (const group of drafts) {
    if (group.poisoned !== null) {
      rejected.push(group.poisoned);
      continue;
    }
    const wire = wireFromGroup(group);
    if ('error' in wire) {
      rejected.push({ txId: group.txId, row: group.row, reason: wire.error, detail: wire.detail });
      continue;
    }

    let resolutionError: RejectedGroup | null = null;
    for (const posting of wire.postings) {
      const accountId = posting.accountId;
      if (accountId === '' || accountId.startsWith('sys:') || existing.refs.accounts.has(accountId)) {
        continue;
      }
      if (badAccounts.has(accountId)) {
        resolutionError = { txId: group.txId, row: group.row, reason: 'account-conflict', detail: `account ${JSON.stringify(accountId)} is defined inconsistently across rows (id, name, type and currency must match)` };
        break;
      }
      if (accountDefs.get(accountId) === undefined) {
        resolutionError = { txId: group.txId, row: group.row, reason: 'unknown-account', detail: `account ${JSON.stringify(accountId)} does not exist and the CSV rows do not define it with a valid account_type and account_name` };
        break;
      }
    }
    if (resolutionError === null) {
      for (const posting of wire.postings) {
        const categoryId = posting.categoryId;
        if (categoryId === undefined || existing.refs.categories.has(categoryId)) {
          continue;
        }
        if (badCategories.has(categoryId)) {
          resolutionError = { txId: group.txId, row: group.row, reason: 'category-conflict', detail: `category ${JSON.stringify(categoryId)} is used with conflicting kinds (income vs expense)` };
          break;
        }
        if (categoryDefs.get(categoryId) === undefined) {
          resolutionError = { txId: group.txId, row: group.row, reason: 'unknown-category', detail: `category ${JSON.stringify(categoryId)} does not exist and the CSV rows do not define it with a non-empty category_name` };
          break;
        }
      }
    }
    if (resolutionError !== null) {
      rejected.push(resolutionError);
      continue;
    }

    let validated: Transaction;
    try {
      validated = fromWire(wire, refs);
    } catch (error) {
      rejected.push({ txId: group.txId, row: group.row, reason: 'invalid-transaction', detail: error instanceof Error ? error.message : String(error) });
      continue;
    }

    const prior = existingById.get(validated.id);
    if (prior !== undefined) {
      if (stableStringify(toWire(prior)) === stableStringify(toWire(validated))) {
        duplicates.push(validated.id);
      } else {
        conflicts.push({ txId: validated.id, row: group.row, detail: `transaction ${JSON.stringify(validated.id)} already exists with different content; the existing one is kept` });
      }
      continue;
    }
    accepted.push(validated);
    existingById.set(validated.id, validated);
  }

  const neededAccounts = new Set<string>();
  const neededCategories = new Set<string>();
  for (const tx of accepted) {
    for (const posting of tx.postings) {
      if (!existing.refs.accounts.has(posting.accountId) && !posting.accountId.startsWith('sys:')) {
        neededAccounts.add(posting.accountId);
      }
      if (posting.categoryId !== undefined && !existing.refs.categories.has(posting.categoryId)) {
        neededCategories.add(posting.categoryId);
      }
    }
  }

  return {
    newAccounts: [...neededAccounts].flatMap((id) => {
      const account = accountDefs.get(id);
      return account !== undefined ? [account] : [];
    }),
    newCategories: [...neededCategories].flatMap((id) => {
      const category = categoryDefs.get(id);
      return category !== undefined ? [category] : [];
    }),
    newTransactions: accepted,
    duplicates,
    conflicts,
    rejected,
    dataRows: rows.length - 1,
  };
}

export function applyImport(db: Db, plan: ImportPlan): void {
  db.transaction(() => {
    for (const account of plan.newAccounts) {
      saveAccount(db, account);
    }
    for (const category of plan.newCategories) {
      saveCategory(db, category);
    }
    for (const tx of plan.newTransactions) {
      saveTransaction(db, tx);
    }
  });
}
