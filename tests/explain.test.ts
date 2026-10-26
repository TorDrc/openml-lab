import { describe, expect, it } from 'vitest';
import { explainModel } from '../src/ml/explain';
import type { ClassificationMetrics, RegressionMetrics, TrainedModel } from '../src/ml/types';

function cls(accuracy: number, n = 60): ClassificationMetrics {
  return { accuracy, macroPrecision: accuracy, macroRecall: accuracy, macroF1: accuracy, confusion: [[1]], perClass: [], n };
}
function reg(r2: number, n = 60): RegressionMetrics {
  return { mae: 4, rmse: 5, r2, n };
}
function fake(task: 'classification' | 'regression', train: unknown, val: unknown, test: unknown, stoppedEarly = false): TrainedModel {
  return {
    task,
    targetName: 'price',
    report: { train, val, test },
    stoppedEarly,
  } as unknown as TrainedModel;
}
const all = (e: ReturnType<typeof explainModel>) => [e.headline, ...e.points, ...e.warnings].join(' | ');

describe('explainModel (classification)', () => {
  it('flags a model that is no better than the majority baseline', () => {
    const e = explainModel(fake('classification', cls(0.5), cls(0.5), cls(0.5)), 0.5);
    expect(all(e)).toContain('no better than always guessing');
  });

  it('flags overfitting when training beats validation by a wide margin', () => {
    const e = explainModel(fake('classification', cls(1), cls(0.7), cls(0.7)), 0.33);
    expect(e.warnings.some((w) => w.startsWith('Overfitting'))).toBe(true);
  });

  it('flags underfitting when every score is low', () => {
    const e = explainModel(fake('classification', cls(0.5), cls(0.5), cls(0.5)), 0.4);
    expect(e.warnings.some((w) => w.startsWith('Underfitting'))).toBe(true);
  });

  it('is positive but still cautious for a healthy model, and warns about tiny test sets', () => {
    const e = explainModel(fake('classification', cls(0.93), cls(0.92), cls(0.91, 30)), 0.34);
    expect(e.headline).toContain('91.0%');
    expect(all(e)).toContain('healthy sign');
    expect(e.warnings.some((w) => w.includes('only 30 rows'))).toBe(true);
    expect(e.warnings.some((w) => w.includes('this dataset only'))).toBe(true);
  });

  it('warns about perfect scores and early stopping', () => {
    const e = explainModel(fake('classification', cls(1), cls(1), cls(1), true), 0.33);
    expect(all(e)).toContain('perfect test score');
    expect(all(e)).toContain('stopped before');
  });
});

describe('explainModel (regression)', () => {
  it('explains a good fit in the target units', () => {
    const e = explainModel(fake('regression', reg(0.9), reg(0.89), reg(0.88)));
    expect(e.headline).toContain('price units');
    expect(all(e)).toContain('explains about 88.0%');
  });

  it('warns when R² is negative', () => {
    const e = explainModel(fake('regression', reg(-0.2), reg(-0.3), reg(-0.4)));
    expect(e.warnings.some((w) => w.includes('worse than simply always guessing the average'))).toBe(true);
  });

  it('flags regression overfitting', () => {
    const e = explainModel(fake('regression', reg(0.99), reg(0.6), reg(0.6)));
    expect(e.warnings.some((w) => w.startsWith('Overfitting'))).toBe(true);
  });
});
