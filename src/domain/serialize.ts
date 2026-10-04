import { DomainError } from './errors.ts';
import { INT64_MAX, INT64_MIN, ROUNDING_MODES, type RoundingMode } from './money.ts';
import {
  POSTING_KINDS,
  QUOTE_DIRECTIONS,
  RATE_SOURCES,
  type Conversion,
  type LedgerRefs,
  type Posting,
  type QuoteDirection,
  type RateSource,
  type Transaction,
} from './types.ts';
import { assertTransaction } from './validate.ts';

const AMOUNT_RE = /^-?(0|[1-9]\d*)$/;
const POSITIVE_INT_RE = /^[1-9]\d*$/;
const TRANSACTION_KEYS = ['id', 'date', 'postings', 'conversion', 'memo'];
const POSTING_KEYS = ['accountId', 'currency', 'amount', 'kind', 'categoryId'];
const CONVERSION_KEYS = ['fromCurrency', 'toCurrency', 'rateText', 'rateRatio', 'quoteDirection', 'rateAt', 'source', 'roundingMode'];
const RATIO_KEYS = ['num', 'den'];

export interface WirePosting {
  readonly accountId: string;
  readonly currency: string;
  readonly amount: string;
  readonly kind: string;
  readonly categoryId?: string;
}

export interface WireRatio {
  readonly num: string;
  readonly den: string;
}

export interface WireConversion {
  readonly fromCurrency: string;
  readonly toCurrency: string;
  readonly rateText: string;
  readonly rateRatio: WireRatio;
  readonly quoteDirection: QuoteDirection;
  readonly rateAt: string;
  readonly source: RateSource;
  readonly roundingMode: RoundingMode;
}

export interface WireTransaction {
  readonly id: string;
  readonly date: string;
  readonly postings: WirePosting[];
  readonly conversion?: WireConversion;
  readonly memo?: string;
}

export function toWire(tx: Transaction): WireTransaction {
  const conversion: Conversion | undefined = tx.conversion;
  const wire: WireTransaction = {
    id: tx.id,
    date: tx.date,
    postings: tx.postings.map((posting) => ({
      accountId: posting.accountId,
      currency: posting.currency,
      amount: posting.amount.toString(),
      kind: posting.kind,
      ...(posting.categoryId !== undefined ? { categoryId: posting.categoryId } : {}),
    })),
    ...(conversion !== undefined
      ? {
          conversion: {
            fromCurrency: conversion.fromCurrency,
            toCurrency: conversion.toCurrency,
            rateText: conversion.rateText,
            rateRatio: { num: conversion.rateRatio.num.toString(), den: conversion.rateRatio.den.toString() },
            quoteDirection: conversion.quoteDirection,
            rateAt: conversion.rateAt,
            source: conversion.source,
            roundingMode: conversion.roundingMode,
          },
        }
      : {}),
    ...(tx.memo !== undefined ? { memo: tx.memo } : {}),
  };
  return wire;
}

function expectObject(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const got = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    throw new DomainError('WIRE_INVALID', `${where}: expected an object, got ${got}`);
  }
  return value as Record<string, unknown>;
}

function expectKeys(obj: Record<string, unknown>, allowed: readonly string[], where: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new DomainError('WIRE_INVALID', `${where}: unknown field ${JSON.stringify(key)} (allowed: ${allowed.join(', ')})`);
    }
  }
}

function expectString(obj: Record<string, unknown>, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string') {
    throw new DomainError('WIRE_INVALID', `${where}.${key}: expected a string, got ${value === undefined ? 'missing' : typeof value}`);
  }
  return value;
}

function expectEnum<T>(value: unknown, allowed: readonly T[], where: string): T {
  if (!allowed.includes(value as T)) {
    throw new DomainError('WIRE_INVALID', `${where}: expected one of [${allowed.map(String).join(', ')}], got ${JSON.stringify(value)}`);
  }
  return value as T;
}

function expectAmount(value: unknown, where: string): bigint {
  if (typeof value !== 'string' || !AMOUNT_RE.test(value)) {
    throw new DomainError('WIRE_INVALID', `${where}: amount must be a canonical integer string of minor units (e.g. "-1234"), got ${JSON.stringify(value)}`);
  }
  const amount = BigInt(value);
  if (amount < INT64_MIN || amount > INT64_MAX) {
    throw new DomainError('AMOUNT_OUT_OF_INT64_RANGE', `${where}: amount ${value} is outside the int64 range`);
  }
  return amount;
}

function expectPositiveInt(value: unknown, where: string): bigint {
  if (typeof value !== 'string' || !POSITIVE_INT_RE.test(value)) {
    throw new DomainError('WIRE_INVALID', `${where}: expected a positive integer string, got ${JSON.stringify(value)}`);
  }
  return BigInt(value);
}

function decodePosting(value: unknown, where: string): Posting {
  const obj = expectObject(value, where);
  expectKeys(obj, POSTING_KEYS, where);
  const amount = expectAmount(obj.amount, `${where}.amount`);
  if (amount === 0n) {
    throw new DomainError('WIRE_INVALID', `${where}.amount: amount must be non-zero`);
  }
  if (obj.categoryId !== undefined && typeof obj.categoryId !== 'string') {
    throw new DomainError('WIRE_INVALID', `${where}.categoryId: expected a string`);
  }
  const categoryId: string | undefined = obj.categoryId as string | undefined;
  const posting: Posting = {
    accountId: expectString(obj, 'accountId', where),
    currency: expectString(obj, 'currency', where),
    amount,
    kind: expectEnum(obj.kind, POSTING_KINDS, `${where}.kind`),
    ...(categoryId !== undefined ? { categoryId } : {}),
  };
  return posting;
}

function decodeConversion(value: unknown, where: string): Conversion {
  const obj = expectObject(value, where);
  expectKeys(obj, CONVERSION_KEYS, where);
  const ratio = expectObject(obj.rateRatio, `${where}.rateRatio`);
  expectKeys(ratio, RATIO_KEYS, `${where}.rateRatio`);
  return {
    fromCurrency: expectString(obj, 'fromCurrency', where),
    toCurrency: expectString(obj, 'toCurrency', where),
    rateText: expectString(obj, 'rateText', where),
    rateRatio: {
      num: expectPositiveInt(ratio.num, `${where}.rateRatio.num`),
      den: expectPositiveInt(ratio.den, `${where}.rateRatio.den`),
    },
    quoteDirection: expectEnum(obj.quoteDirection, QUOTE_DIRECTIONS, `${where}.quoteDirection`),
    rateAt: expectString(obj, 'rateAt', where),
    source: expectEnum(obj.source, RATE_SOURCES, `${where}.source`),
    roundingMode: expectEnum(obj.roundingMode, ROUNDING_MODES, `${where}.roundingMode`),
  };
}

export function fromWire(wire: unknown, refs: LedgerRefs): Transaction {
  const obj = expectObject(wire, 'transaction');
  expectKeys(obj, TRANSACTION_KEYS, 'transaction');

  if (!Array.isArray(obj.postings)) {
    throw new DomainError('WIRE_INVALID', 'transaction.postings: expected an array');
  }
  if (obj.postings.length === 0) {
    throw new DomainError('WIRE_INVALID', 'transaction.postings: must contain at least one posting');
  }

  if (obj.memo !== undefined && typeof obj.memo !== 'string') {
    throw new DomainError('WIRE_INVALID', 'transaction.memo: expected a string');
  }
  const memo: string | undefined = obj.memo as string | undefined;
  const conversion: Conversion | undefined = obj.conversion !== undefined ? decodeConversion(obj.conversion, 'transaction.conversion') : undefined;

  const tx: Transaction = {
    id: expectString(obj, 'id', 'transaction'),
    date: expectString(obj, 'date', 'transaction'),
    postings: obj.postings.map((posting, index) => decodePosting(posting, `transaction.postings[${index}]`)),
    ...(conversion !== undefined ? { conversion } : {}),
    ...(memo !== undefined ? { memo } : {}),
  };
  return assertTransaction(tx, refs);
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const json = JSON.stringify(value);
    return json === undefined ? 'null' : json;
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}
