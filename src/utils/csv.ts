import { sanitizeColumnName, sanitizeText, toCsvField } from './sanitize';

/** Hard limits applied to every uploaded file. Everything runs in the browser. */
export const CSV_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxRows: 20000,
  maxColumns: 100,
} as const;

export type CsvErrorCode =
  | 'EMPTY'
  | 'BAD_EXTENSION'
  | 'TOO_LARGE'
  | 'NOT_TEXT'
  | 'TOO_MANY_ROWS'
  | 'TOO_MANY_COLUMNS'
  | 'UNTERMINATED_QUOTE'
  | 'NO_DATA_ROWS';

export class CsvError extends Error {
  readonly code: CsvErrorCode;
  constructor(code: CsvErrorCode, message: string) {
    super(message);
    this.name = 'CsvError';
    this.code = code;
  }
}

/** A raw cell: trimmed text, or null when the value is missing. */
export type Cell = string | null;
export type ColumnType = 'numeric' | 'categorical' | 'empty';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  /** Number of missing cells. */
  missing: number;
  /** Number of distinct non-missing values. */
  unique: number;
}

export interface Table {
  columns: ColumnInfo[];
  rows: Cell[][];
}

export interface ParseResult {
  table: Table;
  /** Non-fatal problems the user should know about. */
  warnings: string[];
}

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '?', '-']);
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

export function isMissingToken(value: string): boolean {
  return MISSING_TOKENS.has(value.trim().toLowerCase());
}

export function parseNumber(value: Cell): number | null {
  if (value === null) return null;
  const text = value.trim();
  if (!NUMBER_PATTERN.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Validate file metadata before reading it. Throws CsvError. */
export function validateFileMeta(file: { name: string; size: number }): void {
  if (file.size === 0) throw new CsvError('EMPTY', 'The file is empty.');
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
    throw new CsvError('BAD_EXTENSION', 'Please choose a .csv, .tsv or .txt file.');
  }
  if (file.size > CSV_LIMITS.maxBytes) {
    const mb = (CSV_LIMITS.maxBytes / (1024 * 1024)).toFixed(0);
    throw new CsvError('TOO_LARGE', `The file is larger than the ${mb} MB limit.`);
  }
}

/** Pick the most likely delimiter by counting candidates in the header line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? '';
  let best = ',';
  let bestCount = 0;
  for (const candidate of [',', ';', '\t']) {
    let count = 0;
    let inQuotes = false;
    for (const ch of firstLine) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === candidate && !inQuotes) count++;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** RFC 4180-style tokenizer: quotes, escaped quotes, CRLF/LF/CR line endings. */
export function tokenizeCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldWasQuoted = false;
  let i = 0;

  const endField = () => {
    row.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };
  const endRow = () => {
    endField();
    // Skip completely blank lines.
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field.trim() === '') {
      inQuotes = true;
      fieldWasQuoted = true;
      field = '';
      i++;
    } else if (ch === delimiter) {
      endField();
      i++;
    } else if (ch === '\r' || ch === '\n') {
      endRow();
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (inQuotes) {
    throw new CsvError('UNTERMINATED_QUOTE', 'The file has a quote (") that is never closed.');
  }
  if (field !== '' || row.length > 0 || fieldWasQuoted) endRow();
  return rows;
}

/** Parse CSV text into a typed Table. Throws CsvError for unusable input. */
export function parseCsv(input: string): ParseResult {
  const text = input.replace(/^﻿/, '');
  if (text.trim() === '') throw new CsvError('EMPTY', 'The file is empty.');
  if (text.includes('\u0000')) {
    throw new CsvError('NOT_TEXT', 'This does not look like a text file (it contains binary data).');
  }

  const delimiter = detectDelimiter(text);
  const raw = tokenizeCsv(text, delimiter);
  if (raw.length < 2) {
    throw new CsvError('NO_DATA_ROWS', 'The file needs a header row and at least one data row.');
  }

  const header = raw[0];
  const body = raw.slice(1);
  if (header.length > CSV_LIMITS.maxColumns) {
    throw new CsvError('TOO_MANY_COLUMNS', `The file has more than ${CSV_LIMITS.maxColumns} columns.`);
  }
  if (body.length > CSV_LIMITS.maxRows) {
    throw new CsvError('TOO_MANY_ROWS', `The file has more than ${CSV_LIMITS.maxRows} rows.`);
  }

  const warnings: string[] = [];

  // Sanitize and de-duplicate column names.
  const seen = new Map<string, number>();
  const names = header.map((h, idx) => {
    const base = sanitizeColumnName(h, idx);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
  if (names.some((n, idx) => n !== sanitizeColumnName(header[idx], idx))) {
    warnings.push('Some column names were duplicated and have been renamed.');
  }

  // Normalise ragged rows and missing tokens.
  let raggedRows = 0;
  const rows: Cell[][] = body.map((r) => {
    if (r.length !== names.length) raggedRows++;
    return names.map((_, c) => {
      const value = r[c];
      if (value === undefined || isMissingToken(value)) return null;
      return value.trim();
    });
  });
  if (raggedRows > 0) {
    warnings.push(
      `${raggedRows} row(s) had a different number of fields than the header; short rows were padded with missing values and extra fields were ignored.`,
    );
  }

  const columns: ColumnInfo[] = names.map((name, c) => {
    let missing = 0;
    let numericCount = 0;
    const distinct = new Set<string>();
    for (const row of rows) {
      const cell = row[c];
      if (cell === null) {
        missing++;
      } else {
        distinct.add(cell);
        if (parseNumber(cell) !== null) numericCount++;
      }
    }
    const present = rows.length - missing;
    const type: ColumnType = present === 0 ? 'empty' : numericCount === present ? 'numeric' : 'categorical';
    return { name, type, missing, unique: distinct.size };
  });

  if (columns.every((col) => col.type === 'empty')) {
    throw new CsvError('NO_DATA_ROWS', 'Every cell in the file is missing.');
  }

  const missingTotal = columns.reduce((sum, col) => sum + col.missing, 0);
  if (missingTotal > 0) {
    warnings.push(`${missingTotal} missing value(s) found. You can drop those rows or fill them using training-set averages.`);
  }
  return { table: { columns, rows }, warnings };
}

/** Read and parse a user-selected file entirely in the browser. */
export async function parseCsvFile(file: File): Promise<ParseResult> {
  validateFileMeta(file);
  const text = await file.text();
  return parseCsv(text);
}

/** Serialise a table back to CSV text (cells neutralised against formula injection). */
export function tableToCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map((h) => toCsvField(h)).join(',')];
  for (const row of rows) lines.push(row.map((v) => toCsvField(v)).join(','));
  return `${lines.join('\n')}\n`;
}

/** Human-friendly message for any error thrown while loading a file. */
export function describeLoadError(error: unknown): string {
  if (error instanceof CsvError) return error.message;
  return sanitizeText(error instanceof Error ? error.message : 'The file could not be read.', 200);
}
