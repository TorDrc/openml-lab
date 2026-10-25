import { describe, expect, it } from 'vitest';
import { parseCsvText, prepareCsvTable, validateCsvRows } from '../src/utils/csv';

describe('CSV utilities', () => {
  it('parses comma-separated values', () => {
    const rows = parseCsvText('name,score\nalpha,10\n"beta,gamma",12');

    expect(rows).toEqual([
      ['name', 'score'],
      ['alpha', '10'],
      ['beta,gamma', '12']
    ]);
  });

  it('validates row lengths and header presence', () => {
    const valid = validateCsvRows([
      ['feature', 'target'],
      ['1.1', '0'],
      ['2.2', '1']
    ]);
    const invalid = validateCsvRows([
      ['feature', 'target'],
      ['1.1'],
      ['2.2', '1']
    ]);

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('builds a CSV table with header metadata', () => {
    const table = prepareCsvTable([
      ['petal_length', 'species'],
      ['1.4', 'setosa'],
      ['3.5', 'virginica']
    ]);

    expect(table.headers).toEqual(['petal_length', 'species']);
    expect(table.rowCount).toBe(2);
    expect(table.columnCount).toBe(2);
  });
});
