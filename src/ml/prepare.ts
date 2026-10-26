import { parseNumber, type Table } from '../utils/csv';
import type { MissingStrategy, RawData, Task } from './types';

export const MAX_CLASSES = 20;
export const MIN_ROWS_PER_CLASS = 3;
export const MIN_ROWS = 20;

export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataError';
  }
}

/**
 * Turn a parsed table plus the user's column choices into model-ready raw data.
 *
 * Only row-level decisions happen here (no statistics are computed), so this step
 * cannot leak information between the train / validation / test splits. Mean
 * imputation and standardisation are fitted later, on the training split only.
 */
export function selectData(
  table: Table,
  featureNames: string[],
  targetName: string,
  task: Task,
  missing: MissingStrategy,
): RawData {
  if (featureNames.length === 0) throw new DataError('Select at least one feature column.');
  if (new Set(featureNames).size !== featureNames.length) throw new DataError('Feature columns must be unique.');
  if (featureNames.includes(targetName)) {
    throw new DataError('The target column cannot also be used as a feature (that would be data leakage).');
  }

  const colIndex = (name: string): number => {
    const idx = table.columns.findIndex((c) => c.name === name);
    if (idx < 0) throw new DataError(`Column "${name}" does not exist.`);
    return idx;
  };
  const featureIdx = featureNames.map(colIndex);
  const targetIdx = colIndex(targetName);

  for (const idx of featureIdx) {
    const col = table.columns[idx];
    if (col.type !== 'numeric') {
      throw new DataError(`Feature "${col.name}" is not numeric. Only numeric features are supported.`);
    }
  }
  const targetCol = table.columns[targetIdx];
  if (targetCol.type === 'empty') throw new DataError('The target column has no values.');
  if (task === 'regression' && targetCol.type !== 'numeric') {
    throw new DataError(`Regression needs a numeric target, but "${targetCol.name}" is not numeric.`);
  }

  let dropped = 0;
  const X: (number | null)[][] = [];
  const yRaw: string[] = [];
  for (const row of table.rows) {
    const target = row[targetIdx];
    if (target === null) {
      dropped++;
      continue;
    }
    const features = featureIdx.map((i) => parseNumber(row[i]));
    if (missing === 'drop' && features.some((v) => v === null)) {
      dropped++;
      continue;
    }
    X.push(features);
    yRaw.push(target);
  }
  if (X.length < MIN_ROWS) {
    throw new DataError(`Only ${X.length} usable row(s) remain; at least ${MIN_ROWS} are needed to split into train / validation / test sets.`);
  }

  if (task === 'regression') {
    return {
      task,
      featureNames,
      targetName,
      X,
      y: yRaw.map((v) => parseNumber(v) as number),
      classNames: [],
      droppedRows: dropped,
    };
  }

  // Classification: map labels to class indices in a stable (sorted) order.
  const labels = Array.from(new Set(yRaw)).sort((a, b) => {
    const na = parseNumber(a);
    const nb = parseNumber(b);
    return na !== null && nb !== null ? na - nb : a.localeCompare(b);
  });
  if (labels.length < 2) throw new DataError('Classification needs at least two different classes in the target column.');
  if (labels.length > MAX_CLASSES) {
    throw new DataError(`The target has ${labels.length} distinct values; classification supports at most ${MAX_CLASSES}. Did you mean regression?`);
  }
  const index = new Map(labels.map((l, i) => [l, i]));
  const y = yRaw.map((v) => index.get(v) as number);
  const counts = new Array<number>(labels.length).fill(0);
  for (const c of y) counts[c]++;
  const tooSmall = labels.filter((_, i) => counts[i] < MIN_ROWS_PER_CLASS);
  if (tooSmall.length > 0) {
    throw new DataError(
      `Each class needs at least ${MIN_ROWS_PER_CLASS} rows so it appears in every split. Too few rows for: ${tooSmall.slice(0, 5).join(', ')}.`,
    );
  }
  return { task, featureNames, targetName, X, y, classNames: labels, droppedRows: dropped };
}

export interface SuggestedConfig {
  task: Task;
  features: string[];
  target: string;
}

/**
 * Pick sensible defaults for a freshly loaded table: the last usable column is
 * the target, every other numeric column is a feature, and the task is guessed
 * from the target (text or few distinct numbers -> classification). The user can
 * always override these choices.
 */
export function suggestConfig(table: Table): SuggestedConfig {
  const usable = table.columns.filter((c) => c.type !== 'empty');
  const target = usable[usable.length - 1] ?? table.columns[table.columns.length - 1];
  const features = table.columns.filter((c) => c.type === 'numeric' && c.name !== target.name).map((c) => c.name);
  const task: Task = target.type === 'numeric' && target.unique > 10 ? 'regression' : 'classification';
  return { task, features, target: target.name };
}
