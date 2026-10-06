import { getCurrency } from '../../../src/domain/currency.ts';

export function formatDisplayAmount(amount: bigint, currency: string, locale?: string): string {
  const def = getCurrency(currency);
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString().padStart(def.exponent + 1, '0');
  const intPart = digits.slice(0, digits.length - def.exponent);
  const fracPart = def.exponent > 0 ? digits.slice(digits.length - def.exponent) : '';
  const grouped = new Intl.NumberFormat(locale, { useGrouping: true }).format(BigInt(intPart));
  return `${negative ? '-' : ''}${grouped}${def.exponent > 0 ? `.${fracPart}` : ''}`;
}

export function formatSigned(amount: bigint, currency: string, locale?: string): string {
  if (amount < 0n) {
    return `-${formatDisplayAmount(-amount, currency, locale)}`;
  }
  if (amount > 0n) {
    return `+${formatDisplayAmount(amount, currency, locale)}`;
  }
  return formatDisplayAmount(0n, currency, locale);
}

export function currencyLabel(currency: string): string {
  const def = getCurrency(currency);
  return `${def.symbol} ${def.code}`;
}

export function normalizeAmountInput(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (trimmed.includes(',') && trimmed.includes('.')) {
    return trimmed;
  }
  if (trimmed.includes(',')) {
    return trimmed.replace(',', '.');
  }
  return trimmed;
}

export function accessibilityAmount(
  amount: bigint,
  currency: string,
  words: { minus: string; plus: string; zero: string },
  locale?: string,
): string {
  const direction = amount < 0n ? words.minus : amount > 0n ? words.plus : words.zero;
  return `${direction} ${formatDisplayAmount(amount < 0n ? -amount : amount, currency, locale)} ${currency}`;
}
