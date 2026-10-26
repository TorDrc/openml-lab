import { describe, expect, it } from 'vitest';
import {
  CSV_LIMITS,
  CsvError,
  detectDelimiter,
  parseCsv,
  parseNumber,
  tableToCsv,
  tokenizeCsv,
  validateFileMeta,
} from '../src/utils/csv';
import { neutraliseFormula, sanitizeText } from '../src/utils/sanitize';

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof CsvError ? e.code : `other:${String(e)}`;
  }
  return undefined;
}

describe('tokenizeCsv', () => {
  it('handles quoted fields, escaped quotes, embedded commas and newlines', () => {
    const rows = tokenizeCsv('a,b\n"x, y","say ""hi"""\n"line1\nline2",z\n', ',');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['line1\nline2', 'z'],
    ]);
  });

  it('supports CRLF and skips blank lines', () => {
    expect(tokenizeCsv('a,b\r\n1,2\r\n\r\n3,4', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('rejects an unterminated quote', () => {
    expect(errorCode(() => tokenizeCsv('a,b\n"oops,1', ','))).toBe('UNTERMINATED_QUOTE');
  });
});

describe('detectDelimiter', () => {
  it('detects semicolons and tabs', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(detectDelimiter('a,b,c')).toBe(',');
  });
});

describe('parseCsv', () => {
  it('infers column types and counts missing values', () => {
    const { table, warnings } = parseCsv('height,colour,weight\n1.5,red,10\n2.5,blue,\n3,red,NA\n');
    expect(table.columns.map((c) => c.type)).toEqual(['numeric', 'categorical', 'numeric']);
    expect(table.columns[2].missing).toBe(2);
    expect(table.columns[1].unique).toBe(2);
    expect(table.rows[1][2]).toBeNull();
    expect(warnings.some((w) => w.includes('missing'))).toBe(true);
  });

  it('strips a UTF-8 byte-order mark', () => {
    const { table } = parseCsv('﻿a,b\n1,2\n');
    expect(table.columns[0].name).toBe('a');
  });

  it('renames duplicate and blank headers', () => {
    const { table, warnings } = parseCsv('a,a,\n1,2,3\n');
    expect(table.columns.map((c) => c.name)).toEqual(['a', 'a_2', 'column_3']);
    expect(warnings.some((w) => w.includes('duplicated'))).toBe(true);
  });

  it('pads ragged rows and warns', () => {
    const { table, warnings } = parseCsv('a,b,c\n1,2\n1,2,3,4\n');
    expect(table.rows[0]).toEqual(['1', '2', null]);
    expect(table.rows[1]).toEqual(['1', '2', '3']);
    expect(warnings.some((w) => w.includes('different number of fields'))).toBe(true);
  });

  it('rejects empty input, header-only files and binary data', () => {
    expect(errorCode(() => parseCsv('   \n'))).toBe('EMPTY');
    expect(errorCode(() => parseCsv('a,b,c\n'))).toBe('NO_DATA_ROWS');
    expect(errorCode(() => parseCsv('a,b\n1,\u0000\n'))).toBe('NOT_TEXT');
    expect(errorCode(() => parseCsv('a,b\n,\n,\n'))).toBe('NO_DATA_ROWS');
  });

  it('enforces row and column limits', () => {
    const tooManyCols = `${Array.from({ length: CSV_LIMITS.maxColumns + 1 }, (_, i) => `c${i}`).join(',')}\n1\n`;
    expect(errorCode(() => parseCsv(tooManyCols))).toBe('TOO_MANY_COLUMNS');
    const tooManyRows = `a,b\n${'1,2\n'.repeat(CSV_LIMITS.maxRows + 1)}`;
    expect(errorCode(() => parseCsv(tooManyRows))).toBe('TOO_MANY_ROWS');
  });

  it('treats text that merely resembles numbers as categorical', () => {
    const { table } = parseCsv('id\n1\n2\n3x\n');
    expect(table.columns[0].type).toBe('categorical');
  });
});

describe('validateFileMeta', () => {
  it('accepts normal CSV files', () => {
    expect(errorCode(() => validateFileMeta({ name: 'data.csv', size: 1000 }))).toBeUndefined();
  });
  it('rejects empty, wrong-type and oversized files', () => {
    expect(errorCode(() => validateFileMeta({ name: 'data.csv', size: 0 }))).toBe('EMPTY');
    expect(errorCode(() => validateFileMeta({ name: 'photo.png', size: 10 }))).toBe('BAD_EXTENSION');
    expect(errorCode(() => validateFileMeta({ name: 'big.csv', size: CSV_LIMITS.maxBytes + 1 }))).toBe('TOO_LARGE');
  });
});

describe('parseNumber', () => {
  it('parses plain and scientific numbers only', () => {
    expect(parseNumber('3.5')).toBe(3.5);
    expect(parseNumber('-2e3')).toBe(-2000);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('0x10')).toBeNull();
    expect(parseNumber('Infinity')).toBeNull();
    expect(parseNumber('1,5')).toBeNull();
    expect(parseNumber(null)).toBeNull();
  });
});

describe('sanitising and CSV export', () => {
  it('removes control and bidi characters and truncates', () => {
    expect(sanitizeText('a\u0001b‮c')).toBe('abc');
    expect(sanitizeText('x'.repeat(200), 10)).toHaveLength(10);
  });
  it('neutralises spreadsheet formulas but keeps negative numbers', () => {
    expect(neutraliseFormula('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(neutraliseFormula('@cmd')).toBe("'@cmd");
    expect(neutraliseFormula('-5')).toBe('-5');
  });
  it('round-trips through tableToCsv and parseCsv', () => {
    const csv = tableToCsv(['name', 'v'], [['a,b', 1], ['say "x"', 2]]);
    const { table } = parseCsv(csv);
    expect(table.rows[0][0]).toBe('a,b');
    expect(table.rows[1][0]).toBe('say "x"');
  });
});
