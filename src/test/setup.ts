export type CsvTable = {
  headers: string[];
  rows: string[][];
  rowCount: number;
  columnCount: number;
};

export function parseCsvText(text: string) {
  const rows: string[][] = [];
  let buffer = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        buffer += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(buffer.trim());
      buffer = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }
      row.push(buffer.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      buffer = '';
    } else {
      buffer += character;
    }
  }

  if (buffer.length > 0 || row.length > 0) {
    row.push(buffer.trim());
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

export function validateCsvRows(rows: string[][]) {
  const errors: string[] = [];

  if (rows.length < 2) {
    errors.push('CSV must include a header row and at least one data row.');
    return { valid: false, errors };
  }

  const headerLength = rows[0].length;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.length !== headerLength) {
      errors.push(`Row ${index + 1} does not match the header length.`);
    }
    if (row.every((cell) => cell.trim().length === 0)) {
      errors.push(`Row ${index + 1} is empty.`);
    }
  }

  if (rows[0].some((header) => header.trim().length === 0)) {
    errors.push('Header cells cannot be blank.');
  }

  return { valid: errors.length === 0, errors };
}

export function prepareCsvTable(rows: string[][]): CsvTable {
  const headers = rows[0].map((header) => header.trim());
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));

  return {
    headers,
    rows: dataRows,
    rowCount: dataRows.length,
    columnCount: headers.length
  };
}

export function prepareDatasetFromColumns(rows: string[][], featureColumns: string[], targetColumn: string) {
  const headers = rows[0];
  const featureIndexes = featureColumns.map((column) => headers.indexOf(column));
  const targetIndex = headers.indexOf(targetColumn);

  if (featureIndexes.includes(-1) || targetIndex === -1) {
    throw new Error('Selected feature or target column could not be found.');
  }

  const features: number[][] = [];
  const targets: number[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const featureValues = featureIndexes.map((index) => Number.parseFloat(row[index] ?? ''));
    const targetValue = Number.parseFloat(row[targetIndex] ?? '');

    if (featureValues.some((value) => Number.isNaN(value))) {
      throw new Error(`Row ${rowIndex + 1} contains a non-numeric feature value.`);
    }

    if (Number.isNaN(targetValue)) {
      throw new Error(`Row ${rowIndex + 1} contains a missing or invalid target value.`);
    }

    features.push(featureValues);
    targets.push(targetValue);
  }

  return { features, targets };
}
