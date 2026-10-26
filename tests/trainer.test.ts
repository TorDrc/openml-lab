import { describe, expect, it } from 'vitest';
import { getSampleDataset, sampleToTable } from '../src/data/datasets';
import { selectData } from '../src/ml/prepare';
import { boundaryGrid, predictRow, regressionCurve } from '../src/ml/predict';
import { buildSplitData } from '../src/ml/split';
import { ALGORITHMS, algorithmsFor, getAlgorithm, majorityBaseline, trainModel } from '../src/ml/trainer';
import { DEFAULT_PARAMS, isClassificationMetrics } from '../src/ml/types';

function flowers() {
  const ds = getSampleDataset('flowers');
  const raw = selectData(sampleToTable(ds), ds.featureNames, ds.targetName, 'classification', 'drop');
  return buildSplitData(raw, 42);
}
function blobs() {
  const ds = getSampleDataset('blobs');
  const raw = selectData(sampleToTable(ds), ds.featureNames, ds.targetName, 'classification', 'drop');
  return buildSplitData(raw, 42);
}
function houses() {
  const ds = getSampleDataset('houses');
  const raw = selectData(sampleToTable(ds), ds.featureNames, ds.targetName, 'regression', 'drop');
  return buildSplitData(raw, 42);
}

describe('algorithm registry', () => {
  it('lists algorithms per task and rejects unknown ids', () => {
    expect(algorithmsFor('classification').length).toBeGreaterThanOrEqual(3);
    expect(algorithmsFor('regression').length).toBeGreaterThanOrEqual(3);
    expect(ALGORITHMS.every((a) => a.params.length > 0)).toBe(true);
    expect(() => getAlgorithm('nope' as never)).toThrow();
  });
});

describe('trainModel (k-NN, TypeScript engine)', () => {
  it('trains, evaluates all three splits and predicts a raw row with probabilities', async () => {
    const data = flowers();
    const model = await trainModel({ algorithm: 'knn', params: { ...DEFAULT_PARAMS, k: 5 }, data });
    expect(model.history).toHaveLength(0);
    expect(isClassificationMetrics(model.report.test)).toBe(true);
    if (!isClassificationMetrics(model.report.test)) return;
    expect(model.report.test.accuracy).toBeGreaterThan(0.85);
    expect(model.report.train.n + model.report.val.n + model.report.test.n).toBe(150);

    // A made-up flower resembling the first species (small petals).
    const p = predictRow(model, [1.5, 0.3, 5.0, 3.4]);
    expect(p.label).toBe('species_a');
    expect((p.probabilities as number[]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
  });

  it('validates prediction input', async () => {
    const model = await trainModel({ algorithm: 'knn', params: DEFAULT_PARAMS, data: flowers() });
    expect(() => predictRow(model, [1, 2])).toThrow();
    expect(() => predictRow(model, [1, 2, 3, Number.NaN])).toThrow();
  });

  it('rejects an algorithm that does not match the task', async () => {
    let failed = false;
    try {
      await trainModel({ algorithm: 'ridge', params: DEFAULT_PARAMS, data: flowers() });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it('is reproducible: same seed and data give identical predictions', async () => {
    const a = await trainModel({ algorithm: 'knn', params: DEFAULT_PARAMS, data: flowers() });
    const b = await trainModel({ algorithm: 'knn', params: DEFAULT_PARAMS, data: flowers() });
    expect(a.report).toEqual(b.report);
  });

  it('beats the majority-class baseline on blobs and produces a decision-boundary grid', async () => {
    const data = blobs();
    const model = await trainModel({ algorithm: 'knn', params: { ...DEFAULT_PARAMS, k: 7 }, data });
    if (!isClassificationMetrics(model.report.test)) throw new Error('unexpected metrics');
    expect(model.report.test.accuracy).toBeGreaterThan(majorityBaseline(data) + 0.2);

    const grid = boundaryGrid(model, 0, 1, 30);
    expect(grid.classes).toHaveLength(30 * 30);
    expect(new Set(grid.classes).size).toBe(3);
    expect(grid.confidence.every((c) => c > 0 && c <= 1)).toBe(true);
    // Top row is the largest y: the class_c blob (centre near y = 2.5) should dominate there.
    expect(grid.classes[15]).toBe(2);
  });
});

describe('trainModel (ridge, TypeScript engine)', () => {
  it('reports train / validation / test metrics in original units', async () => {
    const data = houses();
    const model = await trainModel({ algorithm: 'ridge', params: { ...DEFAULT_PARAMS, lambda: 1 }, data });
    if (isClassificationMetrics(model.report.test)) throw new Error('unexpected metrics');
    expect(model.report.test.r2).toBeGreaterThan(0.8);
    // Noise sd is 15 (thousands); RMSE should be of that order, proving original units are used.
    expect(model.report.test.rmse).toBeGreaterThan(5);
    expect(model.report.test.rmse).toBeLessThan(30);
    expect(model.report.train.n + model.report.val.n + model.report.test.n).toBe(240);
  });

  it('predicts a plausible price and responds to input changes in the right direction', async () => {
    const model = await trainModel({ algorithm: 'ridge', params: DEFAULT_PARAMS, data: houses() });
    const small = predictRow(model, [60, 2, 20, 10]).value as number;
    const big = predictRow(model, [200, 5, 20, 10]).value as number;
    expect(big).toBeGreaterThan(small + 100);
    const older = predictRow(model, [60, 2, 50, 10]).value as number;
    expect(older).toBeLessThan(small);
  });

  it('produces a regression curve over one feature', async () => {
    const model = await trainModel({ algorithm: 'ridge', params: DEFAULT_PARAMS, data: houses() });
    const curve = regressionCurve(model, 0, 20);
    expect(curve.x).toHaveLength(20);
    expect(curve.y[19]).toBeGreaterThan(curve.y[0]);
  });
});
