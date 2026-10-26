import { beforeAll, describe, expect, it } from 'vitest';
import { getSampleDataset, sampleToTable } from '../src/data/datasets';
import { selectData } from '../src/ml/prepare';
import { buildSplitData } from '../src/ml/split';
import { loadTf } from '../src/ml/tfModels';
import { trainModel } from '../src/ml/trainer';
import { DEFAULT_PARAMS, isClassificationMetrics, type EpochLog } from '../src/ml/types';

// These tests exercise the TensorFlow.js training path on the pure-JS CPU backend
// (deterministic enough for CI and independent of WebGL).

function split(id: string, task: 'classification' | 'regression') {
  const ds = getSampleDataset(id);
  return buildSplitData(selectData(sampleToTable(ds), ds.featureNames, ds.targetName, task, 'drop'), 42);
}

beforeAll(async () => {
  const tf = await loadTf();
  await tf.setBackend('cpu');
  await tf.ready();
}, 60_000);

describe('TensorFlow.js models (CPU backend)', () => {
  it('logistic regression learns the flowers sample and reports a falling loss', async () => {
    const logs: EpochLog[] = [];
    const model = await trainModel({
      algorithm: 'logistic',
      params: { ...DEFAULT_PARAMS, epochs: 40, learningRate: 0.1 },
      data: split('flowers', 'classification'),
      onEpoch: (l) => logs.push(l),
    });
    expect(logs).toHaveLength(40);
    expect(logs[39].trainLoss).toBeLessThan(logs[0].trainLoss);
    if (!isClassificationMetrics(model.report.test)) throw new Error('unexpected metrics');
    expect(model.report.test.accuracy).toBeGreaterThan(0.85);
    const p = model.predictor.predictProba?.([[0, 0, 0, 0]]);
    expect((p as number[][])[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
    model.predictor.dispose();
  }, 120_000);

  it('a neural network separates the two-moons sample better than a straight line', async () => {
    const data = split('moons', 'classification');
    const linear = await trainModel({ algorithm: 'logistic', params: { ...DEFAULT_PARAMS, epochs: 80, learningRate: 0.1 }, data });
    const mlp = await trainModel({
      algorithm: 'mlp-classifier',
      params: { ...DEFAULT_PARAMS, epochs: 120, learningRate: 0.05, hiddenUnits: 16, hiddenLayers: 2 },
      data,
    });
    if (!isClassificationMetrics(linear.report.test) || !isClassificationMetrics(mlp.report.test)) throw new Error('unexpected metrics');
    expect(mlp.report.test.accuracy).toBeGreaterThan(0.85);
    expect(mlp.report.test.accuracy).toBeGreaterThan(linear.report.test.accuracy);
    linear.predictor.dispose();
    mlp.predictor.dispose();
  }, 180_000);

  it('gradient-descent linear regression approaches the closed-form ridge solution', async () => {
    const data = split('houses', 'regression');
    const sgd = await trainModel({ algorithm: 'linear-sgd', params: { ...DEFAULT_PARAMS, epochs: 150, learningRate: 0.05 }, data });
    const ridge = await trainModel({ algorithm: 'ridge', params: { ...DEFAULT_PARAMS, lambda: 0.01 }, data });
    if (isClassificationMetrics(sgd.report.test) || isClassificationMetrics(ridge.report.test)) throw new Error('unexpected metrics');
    expect(sgd.report.test.r2).toBeGreaterThan(0.8);
    expect(Math.abs(sgd.report.test.rmse - ridge.report.test.rmse)).toBeLessThan(5);
    sgd.predictor.dispose();
  }, 120_000);

  it('stops early when the abort signal fires and still returns a usable model', async () => {
    const controller = new AbortController();
    const model = await trainModel({
      algorithm: 'mlp-regressor',
      params: { ...DEFAULT_PARAMS, epochs: 200 },
      data: split('curve', 'regression'),
      signal: controller.signal,
      onEpoch: (l) => {
        if (l.epoch === 3) controller.abort();
      },
    });
    expect(model.stoppedEarly).toBe(true);
    expect(model.history.length).toBeLessThan(10);
    expect(model.report.test.n).toBeGreaterThan(0);
    model.predictor.dispose();
  }, 120_000);
});
