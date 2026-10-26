import { createRng, shuffled, type Rng } from '../utils/rng';
import type { Preprocessor, RawData, SplitData, SplitSet, TargetScaler } from './types';

export interface SplitFractions {
  train: number;
  val: number;
  test: number;
}

export const DEFAULT_FRACTIONS: SplitFractions = { train: 0.6, val: 0.2, test: 0.2 };

export interface IndexSplit {
  train: number[];
  val: number[];
  test: number[];
}

function allocate(n: number, f: SplitFractions): [number, number, number] {
  const total = f.train + f.val + f.test;
  if (!(total > 0) || f.train <= 0 || f.val <= 0 || f.test <= 0) {
    throw new Error('Train, validation and test fractions must all be greater than zero.');
  }
  let nVal = Math.round((n * f.val) / total);
  let nTest = Math.round((n * f.test) / total);
  if (n >= 3) {
    nVal = Math.max(1, nVal);
    nTest = Math.max(1, nTest);
  }
  const nTrain = n - nVal - nTest;
  return [nTrain, nVal, nTest];
}

/**
 * Seeded split of row indices into disjoint train / validation / test sets.
 * With `labels`, the split is stratified so every class is represented in each
 * part (requires at least 3 rows per class).
 */
export function splitIndices(
  n: number,
  fractions: SplitFractions,
  seed: number,
  labels?: number[],
): IndexSplit {
  const rng: Rng = createRng(seed);
  const out: IndexSplit = { train: [], val: [], test: [] };

  const groups: number[][] = [];
  if (labels) {
    const byClass = new Map<number, number[]>();
    labels.forEach((c, i) => {
      const list = byClass.get(c);
      if (list) list.push(i);
      else byClass.set(c, [i]);
    });
    for (const c of Array.from(byClass.keys()).sort((a, b) => a - b)) groups.push(byClass.get(c) as number[]);
  } else {
    groups.push(Array.from({ length: n }, (_, i) => i));
  }

  for (const group of groups) {
    const order = shuffled(group, rng);
    const [nTrain, nVal, nTest] = allocate(order.length, fractions);
    out.train.push(...order.slice(0, nTrain));
    out.val.push(...order.slice(nTrain, nTrain + nVal));
    out.test.push(...order.slice(nTrain + nVal, nTrain + nVal + nTest));
  }
  // Re-shuffle each part so classes are not grouped together.
  out.train = shuffled(out.train, rng);
  out.val = shuffled(out.val, rng);
  out.test = shuffled(out.test, rng);
  return out;
}

/** Fit per-feature mean / std on the TRAINING rows only (missing values ignored). */
export function fitPreprocessor(Xtrain: (number | null)[][], numFeatures: number): Preprocessor {
  const means: number[] = [];
  const stds: number[] = [];
  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    let count = 0;
    for (const row of Xtrain) {
      const v = row[j];
      if (v !== null) {
        sum += v;
        count++;
      }
    }
    const mean = count === 0 ? 0 : sum / count;
    let sq = 0;
    for (const row of Xtrain) {
      const v = row[j];
      if (v !== null) sq += (v - mean) ** 2;
    }
    const std = count > 1 ? Math.sqrt(sq / count) : 0;
    means.push(mean);
    stds.push(std > 1e-12 ? std : 1);
  }
  return { means, stds };
}

/** Standardise rows with a fitted preprocessor; missing values become the training mean (0 after scaling). */
export function applyPreprocessor(pre: Preprocessor, X: (number | null)[][]): number[][] {
  return X.map((row) => row.map((v, j) => (v === null ? 0 : (v - pre.means[j]) / pre.stds[j])));
}

/** Convert one row of raw feature values into the standardised space used by models. */
export function standardiseRow(pre: Preprocessor, values: number[]): number[] {
  return values.map((v, j) => (v - pre.means[j]) / pre.stds[j]);
}

export function fitTargetScaler(yTrain: number[]): TargetScaler {
  const n = yTrain.length;
  const mean = n === 0 ? 0 : yTrain.reduce((a, b) => a + b, 0) / n;
  const variance = n === 0 ? 0 : yTrain.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  return { mean, std: std > 1e-12 ? std : 1 };
}

/**
 * Split raw data and fit every preprocessing statistic on the training part only,
 * then apply it to validation and test data. This is the leakage-safe path.
 */
export function buildSplitData(
  raw: RawData,
  seed = 42,
  fractions: SplitFractions = DEFAULT_FRACTIONS,
): SplitData {
  const labels = raw.task === 'classification' ? raw.y : undefined;
  const idx = splitIndices(raw.X.length, fractions, seed, labels);
  const nf = raw.featureNames.length;

  const trainX = idx.train.map((i) => raw.X[i]);
  const preprocessor = fitPreprocessor(trainX, nf);
  const targetScaler =
    raw.task === 'regression' ? fitTargetScaler(idx.train.map((i) => raw.y[i])) : { mean: 0, std: 1 };

  const build = (rows: number[]): SplitSet => ({
    X: applyPreprocessor(
      preprocessor,
      rows.map((i) => raw.X[i]),
    ),
    y: rows.map((i) => (raw.task === 'regression' ? (raw.y[i] - targetScaler.mean) / targetScaler.std : raw.y[i])),
  });

  return {
    task: raw.task,
    featureNames: raw.featureNames,
    targetName: raw.targetName,
    classNames: raw.classNames,
    train: build(idx.train),
    val: build(idx.val),
    test: build(idx.test),
    preprocessor,
    targetScaler,
    seed,
  };
}
