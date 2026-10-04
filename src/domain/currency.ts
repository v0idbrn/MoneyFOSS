import { DomainError } from './errors.ts';

export interface CurrencyDef {
  readonly code: string;
  readonly exponent: number;
  readonly symbol: string;
  readonly name: string;
}

const CURRENCIES: Readonly<Record<string, CurrencyDef>> = {
  ARS: { code: 'ARS', exponent: 2, symbol: '$', name: 'Argentine peso' },
  USD: { code: 'USD', exponent: 2, symbol: 'US$', name: 'US dollar' },
  EUR: { code: 'EUR', exponent: 2, symbol: '\u20AC', name: 'Euro' },
  CLP: { code: 'CLP', exponent: 0, symbol: '$', name: 'Chilean peso' },
  JPY: { code: 'JPY', exponent: 0, symbol: '\u00A5', name: 'Japanese yen' },
  KWD: { code: 'KWD', exponent: 3, symbol: 'KD', name: 'Kuwaiti dinar' },
};

export function isKnownCurrency(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code);
}

export function getCurrency(code: string): CurrencyDef {
  if (!isKnownCurrency(code)) {
    throw new DomainError('UNKNOWN_CURRENCY', `unknown currency code: ${JSON.stringify(code)}`);
  }
  return CURRENCIES[code]!;
}

export function listCurrencies(): CurrencyDef[] {
  return Object.values(CURRENCIES);
}
