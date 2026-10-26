import { describe, expect, it } from 'vitest';
import { getSampleDataset, sampleToCsv, sampleToTable, SAMPLE_DATASET_LIST } from '../src/data/datasets';
import { fitKnn } from '../src/ml/knn';
import { argmax, classificationMetrics, confusionMatrix, regressionMetrics } from '../src/ml/metrics';
import { selectData } from '../src/ml/prepare';
import { fitRidge, ridgePredictor, solveLinearSystem } from '../src/ml/ridge';
import { buildSplitData } from '../src/ml/split';
import { parseCsv } from '../src/utils/csv';

describe('metrics', () => {
  it('computes accuracy, precision, recall and F1 from a confusion matrix', () => {
    const yTrue = [0, 0, 0, 1, 1, 1, 2, 2];
    const yPred = [0, 0, 1, 1, 1, 2, 2, 2];
    expect(confusionMatrix(yTrue, yPred, 3)).toEqual([
      [2, 1, 0],
      [0, 2, 1],
      [0, 0, 2],
    ]);
    const m = classificationMetrics(yTrue, yPred, 3);
    expect(m.accuracy).toBeCloseTo(6 / 8, 10);
    expect(m.perClass[0].precision).toBe(1);
    expect(m.perClass[0].recall).toBeCloseTo(2 / 3, 10);
    expect(m.perClass[2].precision).toBeCloseTo(2 / 3, 10);
    expect(m.macroF1).toBeGreaterThan(0.7);
    expect(m.n).toBe(8);
  });

  it('handles classes that are never predicted without NaN', () => {
    const m = classificationMetrics([0, 1], [0, 0], 2);
    expect(Number.isNaN(m.macroPrecision)).toBe(false);
    expect(m.perClass[1].precision).toBe(0);
  });

  it('computes MAE, RMSE and R² (including negative R²)', () => {
    const m = regressionMetrics([1, 2, 3, 4], [1, 2, 3, 4]);
    expect(m.mae).toBe(0);
    expect(m.rmse).toBe(0);
    expect(m.r2).toBe(1);
    const n = regressionMetrics([1, 2, 3], [2, 3, 4]);
    expect(n.mae).toBe(1);
    expect(n.rmse).toBe(1);
    const worse = regressionMetrics([1, 2, 3], [3, 2, 1]);
    expect(worse.r2).toBeLessThan(0);
  });

  it('argmax picks the largest value', () => {
    expect(argmax([0.1, 0.7, 0.2])).toBe(1);
  });

  it('rejects mismatched lengths', () => {
    expect(() => regressionMetrics([1], [1, 2])).toThrow();
  });
});

describe('k-NN', () => {
  const X = [
    [0, 0],
    [0.1, 0.1],
    [0, 0.2],
    [5, 5],
    [5.1, 4.9],
    [4.9, 5.2],
  ];
  const y = [0, 0, 0, 1, 1, 1];

  it('predicts the nearest cluster and returns probabilities that sum to 1', () => {
    const knn = fitKnn(X, y, 2, 3);
    expect(knn.predict([[0.2, 0.1], [4.8, 5]])).toEqual([0, 1]);
    const p = knn.predictProba?.([[2.5, 2.5]]);
    expect(p).toBeTruthy();
    expect((p as number[][])[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('clamps k to the number of training rows', () => {
    const knn = fitKnn(X, y, 2, 100);
    const p = (knn.predictProba as (r: number[][]) => number[][])([[0, 0]])[0];
    expect(p[0]).toBeCloseTo(0.5, 10);
  });

  it('with k = 1 reproduces training labels exactly', () => {
    const knn = fitKnn(X, y, 2, 1);
    expect(knn.predict(X)).toEqual(y);
  });
});

describe('ridge regression', () => {
  it('solves a small linear system', () => {
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    );
    expect(x[0]).toBeCloseTo(1, 10);
    expect(x[1]).toBeCloseTo(3, 10);
  });

  it('recovers true coefficients from noiseless data', () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 30; i++) {
      const a = Math.sin(i);
      const b = Math.cos(i * 1.7);
      X.push([a, b]);
      y.push(3 * a - 2 * b + 5);
    }
    const fit = fitRidge(X, y, 0);
    expect(fit.weights[0]).toBeCloseTo(3, 6);
    expect(fit.weights[1]).toBeCloseTo(-2, 6);
    expect(fit.bias).toBeCloseTo(5, 6);
    expect(ridgePredictor(fit).predict([[1, 1]])[0]).toBeCloseTo(6, 6);
  });

  it('a larger lambda shrinks the weights', () => {
    const X = Array.from({ length: 20 }, (_, i) => [Math.sin(i), Math.cos(i)]);
    const y = X.map((r) => 4 * r[0] + r[1]);
    const small = fitRidge(X, y, 0.01);
    const big = fitRidge(X, y, 50);
    expect(Math.abs(big.weights[0])).toBeLessThan(Math.abs(small.weights[0]));
  });

  it('reports linearly dependent features instead of returning garbage', () => {
    const X = Array.from({ length: 10 }, (_, i) => [i, 2 * i]);
    expect(() => fitRidge(X, X.map((r) => r[0]), 0)).toThrow();
  });
});

describe('sample datasets', () => {
  it('are deterministic and available for every listed id', () => {
    for (const info of SAMPLE_DATASET_LIST) {
      const a = getSampleDataset(info.id);
      const b = getSampleDataset(info.id);
      expect(a.rows).toEqual(b.rows);
      expect(a.rows.length).toBeGreaterThan(100);
      expect(a.headers).toEqual([...a.featureNames, a.targetName]);
    }
  });

  it('survive a CSV round trip through the same parser used for uploads', () => {
    for (const info of SAMPLE_DATASET_LIST) {
      const ds = getSampleDataset(info.id);
      const table = parseCsv(sampleToCsv(ds)).table;
      expect(table.rows).toHaveLength(ds.rows.length);
      expect(table.columns.map((c) => c.name)).toEqual(ds.headers);
    }
  });

  it('the missing-value sample really contains missing values', () => {
    const table = sampleToTable(getSampleDataset('houses-missing'));
    expect(table.columns.filter((c) => c.missing > 0).length).toBeGreaterThan(0);
    expect(sampleToTable(getSampleDataset('houses')).columns.every((c) => c.missing === 0)).toBe(true);
  });

  it('throws for an unknown id', () => {
    expect(() => getSampleDataset('nope')).toThrow();
  });
});

describe('end-to-end flows without TensorFlow.js', () => {
  it('k-NN reaches high held-out accuracy on the flowers sample', () => {
    const table = sampleToTable(getSampleDataset('flowers'));
    const raw = selectData(table, ['petal_length', 'petal_width', 'sepal_length', 'sepal_width'], 'species', 'classification', 'drop');
    const data = buildSplitData(raw, 42);
    const model = fitKnn(data.train.X, data.train.y, raw.classNames.length, 5);
    const test = classificationMetrics(data.test.y, model.predict(data.test.X), raw.classNames.length);
    expect(test.accuracy).toBeGreaterThan(0.85);
    expect(data.train.y.length + data.val.y.length + data.test.y.length).toBe(150);
  });

  it('ridge beats the mean-only baseline on house prices (R² on the test split)', () => {
    const table = sampleToTable(getSampleDataset('houses'));
    const raw = selectData(table, ['size_m2', 'bedrooms', 'age_years', 'distance_km'], 'price_k', 'regression', 'drop');
    const data = buildSplitData(raw, 42);
    const fit = fitRidge(data.train.X, data.train.y, 1);
    const pred = ridgePredictor(fit).predict(data.test.X).map((v) => v * data.targetScaler.std + data.targetScaler.mean);
    const truth = data.test.y.map((v) => v * data.targetScaler.std + data.targetScaler.mean);
    const m = regressionMetrics(truth, pred);
    expect(m.r2).toBeGreaterThan(0.8);
    expect(m.rmse).toBeLessThan(30);
  });

  it('handles the missing-value sample with both strategies', () => {
    const table = sampleToTable(getSampleDataset('houses-missing'));
    const feats = ['size_m2', 'bedrooms', 'age_years', 'distance_km'];
    const dropped = selectData(table, feats, 'price_k', 'regression', 'drop');
    const imputed = selectData(table, feats, 'price_k', 'regression', 'impute-mean');
    expect(dropped.X.length).toBeLessThan(imputed.X.length);
    expect(buildSplitData(imputed, 1).train.X.flat().every((v) => Number.isFinite(v))).toBe(true);
  });
});
