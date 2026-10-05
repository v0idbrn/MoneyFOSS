import { DomainError } from './errors.ts';
import { isKnownCurrency } from './currency.ts';
import { INT64_MAX, INT64_MIN, ROUNDING_MODES, parseRatio, reduceRatio } from './money.ts';
import {
  FX_ACCOUNT_PREFIX,
  POSTING_KINDS,
  QUOTE_DIRECTIONS,
  RATE_SOURCES,
  SYSTEM_EXPENSE_ID,
  SYSTEM_INCOME_ID,
  deriveConversionDest,
  fxAccountCurrency,
  type LedgerRefs,
  type Posting,
  type Transaction,
} from './types.ts';

const ID_MAX_LENGTH = 128;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function isValidDate(text: string): boolean {
  if (!DATE_RE.test(text)) {
    return false;
  }
  const [year, month, day] = text.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTimestamp(text: string): boolean {
  if (DATE_RE.test(text)) {
    return isValidDate(text);
  }
  if (!DATETIME_RE.test(text)) {
    return false;
  }
  return !Number.isNaN(Date.parse(text));
}

function checkValueAccountPosting(posting: Posting, accountId: string, where: string, problems: string[], refs: LedgerRefs): void {
  const account = refs.accounts.get(accountId);
  if (!account) {
    problems.push(`${where}: unknown account ${JSON.stringify(accountId)}`);
    return;
  }
  if (account.type !== 'ASSET' && account.type !== 'LIABILITY' && account.type !== 'EQUITY') {
    problems.push(
      `${where}: account ${JSON.stringify(accountId)} has unknown type ${JSON.stringify(String(account.type))}; value accounts must be ASSET|LIABILITY|EQUITY`,
    );
  }
  if (posting.kind === 'bridge') {
    problems.push(`${where}: bridge postings are only allowed on FX system accounts, not on account ${JSON.stringify(accountId)}`);
  }
  if (posting.currency !== account.currency) {
    problems.push(
      `${where}: account ${JSON.stringify(accountId)} is ${account.type} in ${account.currency} but the posting currency is ${posting.currency}`,
    );
  }
  if (posting.categoryId !== undefined) {
    problems.push(
      `${where}: category is forbidden on value account ${JSON.stringify(accountId)}; categories live only on ${SYSTEM_INCOME_ID}/${SYSTEM_EXPENSE_ID}`,
    );
  }
}

function checkCategoryOnSystemPosting(posting: Posting, where: string, problems: string[], refs: LedgerRefs): void {
  if (posting.categoryId === undefined) {
    return;
  }
  if (typeof posting.categoryId !== 'string' || posting.categoryId.length === 0) {
    problems.push(`${where}: categoryId must be a non-empty string`);
    return;
  }
  const category = refs.categories.get(posting.categoryId);
  if (!category) {
    problems.push(`${where}: unknown category ${JSON.stringify(posting.categoryId)}`);
    return;
  }
  const expected = posting.accountId === SYSTEM_INCOME_ID ? 'income' : 'expense';
  if (category.kind !== expected) {
    problems.push(
      `${where}: category ${JSON.stringify(category.id)} is ${category.kind} but the posting is on ${posting.accountId}, which requires an ${expected} category`,
    );
  }
}

function checkConversion(tx: Transaction, bridges: readonly Posting[], problems: string[]): void {
  const conv = tx.conversion;
  const tag = `tx ${tx.id} conversion`;
  if (conv === undefined) {
    if (bridges.length > 0) {
      problems.push(
        `tx ${tx.id}: ${bridges.length} bridge posting(s) without a Conversion record (Conversion exists iff there are exactly 2 bridges)`,
      );
    }
    return;
  }
  if (typeof conv !== 'object' || conv === null) {
    problems.push(`tx ${tx.id}: conversion must be an object`);
    return;
  }

  if (!isKnownCurrency(conv.fromCurrency)) {
    problems.push(`${tag}: unknown fromCurrency ${JSON.stringify(conv.fromCurrency)}`);
  }
  if (!isKnownCurrency(conv.toCurrency)) {
    problems.push(`${tag}: unknown toCurrency ${JSON.stringify(conv.toCurrency)}`);
  }
  if (conv.fromCurrency === conv.toCurrency) {
    problems.push(`${tag}: fromCurrency and toCurrency must differ, both are ${JSON.stringify(conv.fromCurrency)}`);
  }
  if (!QUOTE_DIRECTIONS.includes(conv.quoteDirection)) {
    problems.push(`${tag}: quoteDirection must be srcPerDest|destPerSrc, got ${String(conv.quoteDirection)}`);
  }
  if (!RATE_SOURCES.includes(conv.source)) {
    problems.push(`${tag}: source must be manual|institution|file, got ${String(conv.source)}`);
  }
  if (!ROUNDING_MODES.includes(conv.roundingMode)) {
    problems.push(`${tag}: unknown roundingMode ${String(conv.roundingMode)}`);
  }
  if (typeof conv.rateAt !== 'string' || !isValidTimestamp(conv.rateAt)) {
    problems.push(`${tag}: rateAt must be a valid date or ISO datetime, got ${JSON.stringify(conv.rateAt)}`);
  }

  const ratioOk =
    typeof conv.rateRatio?.num === 'bigint' &&
    typeof conv.rateRatio?.den === 'bigint' &&
    conv.rateRatio.num > 0n &&
    conv.rateRatio.den > 0n;
  if (!ratioOk) {
    problems.push(`${tag}: rateRatio must be a positive integer ratio num/den, got ${String(conv.rateRatio?.num)}/${String(conv.rateRatio?.den)}`);
  } else if (typeof conv.rateText === 'string') {
    try {
      const reparsed = parseRatio(conv.rateText);
      const stored = reduceRatio(conv.rateRatio);
      if (reparsed.num !== stored.num || reparsed.den !== stored.den) {
        problems.push(
          `${tag}: rateRatio ${stored.num}/${stored.den} is inconsistent with rateText ${JSON.stringify(conv.rateText)}, which parses to ${reparsed.num}/${reparsed.den}`,
        );
      }
    } catch (error) {
      problems.push(`${tag}: rateText is not a valid rate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (bridges.length !== 2) {
    problems.push(`${tag}: a Conversion requires exactly 2 bridge postings, got ${bridges.length}`);
    return;
  }
  const fromBridge = bridges.find((p) => p.currency === conv.fromCurrency);
  const toBridge = bridges.find((p) => p.currency === conv.toCurrency);
  if (!fromBridge || !toBridge) {
    problems.push(
      `${tag}: bridge currencies [${bridges.map((p) => p.currency).join(', ')}] must be exactly {${conv.fromCurrency}, ${conv.toCurrency}}`,
    );
    return;
  }
  if (!isKnownCurrency(conv.fromCurrency) || !isKnownCurrency(conv.toCurrency) || !ratioOk) {
    return;
  }
  const srcAbs = fromBridge.amount < 0n ? -fromBridge.amount : fromBridge.amount;
  const destAbs = toBridge.amount < 0n ? -toBridge.amount : toBridge.amount;
  let expected: bigint;
  try {
    expected = deriveConversionDest(conv, srcAbs);
  } catch (error) {
    problems.push(`${tag}: cannot re-derive conversion: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (expected !== destAbs) {
    problems.push(
      `${tag}: does not re-derive: ${srcAbs} minor units ${conv.fromCurrency} at rate ${JSON.stringify(conv.rateText)} (${conv.quoteDirection}, ${conv.roundingMode}) should give ${expected} minor units ${conv.toCurrency}, but the bridge stores ${destAbs}`,
    );
  }
}

export function findTransactionProblems(tx: Transaction, refs: LedgerRefs): string[] {
  const problems: string[] = [];
  if (typeof tx !== 'object' || tx === null) {
    throw new DomainError('INVALID_TRANSACTION', 'transaction must be an object');
  }
  const tag = typeof tx.id === 'string' && tx.id.length > 0 ? `tx ${tx.id}` : 'tx <no id>';

  if (typeof tx.id !== 'string' || tx.id.length === 0 || tx.id.length > ID_MAX_LENGTH) {
    problems.push(`${tag}: id must be a non-empty string of at most ${ID_MAX_LENGTH} characters`);
  }
  if (typeof tx.date !== 'string' || !isValidDate(tx.date)) {
    problems.push(`${tag}: date must be a valid YYYY-MM-DD date, got ${JSON.stringify(tx.date)}`);
  }
  if (tx.memo !== undefined && typeof tx.memo !== 'string') {
    problems.push(`${tag}: memo must be a string when present`);
  }
  if (!Array.isArray(tx.postings)) {
    problems.push(`${tag}: postings must be an array`);
    return problems;
  }
  if (tx.postings.length < 2) {
    problems.push(`${tag}: a transaction needs at least 2 postings, got ${tx.postings.length}`);
  }

  const sums = new Map<string, bigint>();
  tx.postings.forEach((posting, index) => {
    const where = `${tag} posting[${index}]`;
    if (typeof posting !== 'object' || posting === null) {
      problems.push(`${where}: posting must be an object`);
      return;
    }
    let usable = true;

    if (typeof posting.accountId !== 'string' || posting.accountId.length === 0) {
      problems.push(`${where}: accountId must be a non-empty string`);
      usable = false;
    }
    if (typeof posting.currency !== 'string' || !isKnownCurrency(posting.currency)) {
      problems.push(`${where}: unknown currency ${JSON.stringify(posting.currency)}`);
      usable = false;
    }
    if (typeof posting.amount !== 'bigint') {
      problems.push(`${where}: amount must be an integer bigint of minor units`);
      usable = false;
    } else if (posting.amount === 0n) {
      problems.push(`${where}: amount must be non-zero`);
      usable = false;
    } else if (posting.amount < INT64_MIN || posting.amount > INT64_MAX) {
      problems.push(`${where}: amount ${posting.amount} is outside the int64 range`);
      usable = false;
    }
    if (!POSTING_KINDS.includes(posting.kind)) {
      problems.push(`${where}: kind must be normal|bridge, got ${String(posting.kind)}`);
      usable = false;
    }

    if (usable && typeof posting.accountId === 'string') {
      const accountId = posting.accountId;
      if (accountId === SYSTEM_INCOME_ID || accountId === SYSTEM_EXPENSE_ID) {
        if (posting.kind === 'bridge') {
          problems.push(`${where}: bridge postings are only allowed on FX system accounts, not on ${accountId}`);
        }
        checkCategoryOnSystemPosting(posting, where, problems, refs);
      } else if (accountId.startsWith(FX_ACCOUNT_PREFIX)) {
        const fxCurrency = fxAccountCurrency(accountId);
        if (!fxCurrency || !isKnownCurrency(fxCurrency)) {
          problems.push(`${where}: FX account ${JSON.stringify(accountId)} has an unknown currency`);
        } else {
          if (posting.kind !== 'bridge') {
            problems.push(`${where}: account ${JSON.stringify(accountId)} accepts only kind "bridge" postings`);
          }
          if (posting.kind === 'bridge' && posting.currency !== fxCurrency) {
            problems.push(`${where}: bridge posting currency ${posting.currency} does not match FX account currency ${fxCurrency}`);
          }
        }
      } else {
        checkValueAccountPosting(posting, accountId, where, problems, refs);
      }
    }

    if (typeof posting.currency === 'string' && typeof posting.amount === 'bigint') {
      sums.set(posting.currency, (sums.get(posting.currency) ?? 0n) + posting.amount);
    }
  });

  for (const [currency, sum] of sums) {
    if (sum !== 0n) {
      problems.push(`${tag}: currency ${currency} does not balance: sum of amounts is ${sum}, expected 0`);
    }
  }

  const bridges = tx.postings.filter(
    (posting) => typeof posting === 'object' && posting !== null && posting.kind === 'bridge',
  );
  checkConversion(tx, bridges, problems);

  return problems;
}

export function assertTransaction(tx: Transaction, refs: LedgerRefs): Transaction {
  const problems = findTransactionProblems(tx, refs);
  if (problems.length > 0) {
    throw new DomainError('INVALID_TRANSACTION', `transaction failed validation:\n- ${problems.join('\n- ')}`);
  }
  return tx;
}
