import { DomainError } from '../../../src/domain/errors.ts';

export const CSV_MAX_INPUT = 8 * 1024 * 1024;
export const CSV_MAX_ROWS = 50000;

function needsQuote(value: string): boolean {
  return value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r');
}

export function toCsvCell(value: string): string {
  return needsQuote(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return `${rows.map((row) => row.map(toCsvCell).join(',')).join('\n')}\n`;
}

export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  if (text.length > CSV_MAX_INPUT) {
    throw new DomainError('CSV_INVALID', `CSV input of ${text.length} characters exceeds the ${CSV_MAX_INPUT} byte limit`);
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let atCellStart = true;
  let closedQuote = false;
  let i = 0;

  const endRow = (): void => {
    row.push(cell);
    cell = '';
    atCellStart = true;
    closedQuote = false;
    rows.push(row);
    row = [];
    if (rows.length > CSV_MAX_ROWS) {
      throw new DomainError('CSV_INVALID', `CSV exceeds the limit of ${CSV_MAX_ROWS} rows`);
    }
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          atCellStart = false;
          i += 2;
          continue;
        }
        inQuotes = false;
        closedQuote = true;
        atCellStart = false;
        i += 1;
        continue;
      }
      cell += ch;
      atCellStart = false;
      i += 1;
      continue;
    }
    if (closedQuote && ch !== ',' && ch !== '\n' && ch !== '\r') {
      throw new DomainError('CSV_INVALID', `unexpected character after a closing quote at offset ${i}`);
    }
    if (ch === '"' && atCellStart && cell === '') {
      inQuotes = true;
      atCellStart = false;
      i += 1;
      continue;
    }
    if (ch === '"') {
      throw new DomainError('CSV_INVALID', `unexpected quote inside a cell at offset ${i}`);
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      atCellStart = true;
      closedQuote = false;
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      endRow();
      i += 1;
      continue;
    }
    cell += ch;
    atCellStart = false;
    closedQuote = false;
    i += 1;
  }
  if (inQuotes) {
    throw new DomainError('CSV_INVALID', 'unterminated quoted cell');
  }
  if (cell !== '' || row.length > 0) {
    endRow();
  }
  return rows;
}
