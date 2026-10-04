import { DomainError } from './errors.ts';
import { getCurrency, isKnownCurrency } from './currency.ts';

export interface Money {
  readonly amount: bigint;
  readonly currency: string;
}

export type RoundingMode = 'half-away-from-zero' | 'half-even' | 'truncate';

export const ROUNDING_MODES: readonly RoundingMode[] = ['half-away-from-zero', 'half-even', 'truncate'];
export const DEFAULT_ROUNDING: RoundingMode = 'half-away-from-zero';

export interface Ratio {
  readonly num: bigint;
  readonly den: bigint;
}

export const INT64_MIN = -(2n ** 63n);
export const INT64_MAX = 2n ** 63n - 1n;

const MONEY_RE = /^(-?)(\d+)(?:\.(\d+))?$/;
const RATIO_RE = /^(\d+)(?:\.(\d+))?$/;
const MAX_RATE_TEXT_LENGTH = 32;

export function assertInt64(value: bigint, what: string): void {
  if (value < INT64_MIN || value > INT64_MAX) {
    throw new DomainError('AMOUNT_OUT_OF_INT64_RANGE', `${what}: ${value} is outside the int64 range`);
  }
}

export function money(amount: bigint, currency: string): Money {
  if (!isKnownCurrency(currency)) {
    throw new DomainError('UNKNOWN_CURRENCY', `unknown currency code: ${JSON.stringify(currency)}`);
  }
  assertInt64(amount, `amount for ${currency}`);
  return { amount, currency };
}

export function parseMoney(text: string, currency: string): Money {
  const def = getCurrency(currency);
  const match = MONEY_RE.exec(text);
  if (!match) {
    throw new DomainError(
      'INVALID_MONEY_FORMAT',
      `not a plain decimal amount: ${JSON.stringify(text)} (expected e.g. "1234.56", no separators or suffixes)`,
    );
  }
  const fraction = match[3] ?? '';
  if (fraction.length > def.exponent) {
    throw new DomainError(
      'EXCESS_DECIMALS',
      `${text}: ${fraction.length} decimal places but ${currency} has exponent ${def.exponent}; input is never rounded, fix the amount`,
    );
  }
  const units = BigInt(match[2]!) * 10n ** BigInt(def.exponent);
  const fractionUnits = fraction.length > 0 ? BigInt(fraction.padEnd(def.exponent, '0')) : 0n;
  const signed = units + fractionUnits;
  return money(match[1] === '-' ? -signed : signed, currency);
}

export function formatMoney(m: Money): string {
  const { exponent } = getCurrency(m.currency);
  const negative = m.amount < 0n;
  const digits = (negative ? -m.amount : m.amount).toString().padStart(exponent + 1, '0');
  const integerPart = digits.slice(0, digits.length - exponent);
  const fractionPart = exponent > 0 ? `.${digits.slice(digits.length - exponent)}` : '';
  return `${negative ? '-' : ''}${integerPart}${fractionPart}`;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new DomainError('CURRENCY_MISMATCH', `cannot add ${a.currency} and ${b.currency}`);
  }
  return money(a.amount + b.amount, a.currency);
}

export function subMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new DomainError('CURRENCY_MISMATCH', `cannot subtract ${b.currency} from ${a.currency}`);
  }
  return money(a.amount - b.amount, a.currency);
}

export function deriveMinorUnits(
  numerator: bigint,
  denominator: bigint,
  mode: RoundingMode = DEFAULT_ROUNDING,
): bigint {
  if (!ROUNDING_MODES.includes(mode)) {
    throw new DomainError('UNKNOWN_ROUNDING_MODE', `unknown rounding mode: ${String(mode)}`);
  }
  if (denominator === 0n) {
    throw new DomainError('DIVISION_BY_ZERO', 'monetary division by zero');
  }
  if (numerator === 0n) {
    return 0n;
  }
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = n / d;
  const remainder = n % d;
  let rounded = quotient;
  if (remainder !== 0n && mode !== 'truncate') {
    const twice = remainder * 2n;
    const roundUp =
      mode === 'half-even' ? twice > d || (twice === d && quotient % 2n === 1n) : twice >= d;
    if (roundUp) {
      rounded = quotient + 1n;
    }
  }
  return negative ? -rounded : rounded;
}

export function convertMinor(
  srcMinor: bigint,
  srcExponent: number,
  destExponent: number,
  num: bigint,
  den: bigint,
  mode: RoundingMode,
): bigint {
  if (num <= 0n || den <= 0n) {
    throw new DomainError('INVALID_RATE_RATIO', `rate ratio must be positive, got ${num}/${den}`);
  }
  const numerator = srcMinor * num * 10n ** BigInt(destExponent);
  const denominator = den * 10n ** BigInt(srcExponent);
  return deriveMinorUnits(numerator, denominator, mode);
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

export function reduceRatio(ratio: Ratio): Ratio {
  const divisor = gcd(ratio.num, ratio.den);
  return { num: ratio.num / divisor, den: ratio.den / divisor };
}

export function parseRatio(text: string): Ratio {
  if (text.length > MAX_RATE_TEXT_LENGTH) {
    throw new DomainError('RATE_TEXT_TOO_LONG', `rate text longer than ${MAX_RATE_TEXT_LENGTH} characters: ${text.length}`);
  }
  const match = RATIO_RE.exec(text);
  if (!match) {
    throw new DomainError(
      'INVALID_RATE_FORMAT',
      `not a plain positive decimal rate: ${JSON.stringify(text)} (expected e.g. "1180" or "0.000847")`,
    );
  }
  const fraction = match[2] ?? '';
  const num = BigInt(match[1]!) * 10n ** BigInt(fraction.length) + (fraction.length > 0 ? BigInt(fraction) : 0n);
  const den = 10n ** BigInt(fraction.length);
  if (num === 0n) {
    throw new DomainError('RATE_MUST_BE_POSITIVE', `rate must be greater than zero, got ${JSON.stringify(text)}`);
  }
  return reduceRatio({ num, den });
}
