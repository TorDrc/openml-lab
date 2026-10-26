import { describe, expect, it } from 'vitest';
import { DataError, selectData } from '../src/ml/prepare';
import { buildSplitData, fitPreprocessor, splitIndices } from '../src/ml/split';
import { parseCsv } from '../src/utils/csv';
import { createRng, shuffled } from '../src/utils/rng';

const F = { train: 0.6, val: 0.2, test: 0.2 };

describe('rng', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = createRng(5);
    const b = createRng(5);
    const c = createRng(6);
    const seqA = [a.next(), a.next(), a.next()];
    expect(seqA).toEqual([b.next(), b.next(), b.next()]);
    expect(seqA[0]).not.toBe(c.next());
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });
  it('shuffles without losing items or mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input, createRng(1));
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('splitIndices', () => {
  it('produces disjoint splits that cover every row exactly once', () => {
    const s = splitIndices(100, F, 3);
    const all = [...s.train, ...s.val, ...s.test];
    expect(all).toHaveLength(100);
    expect(new Set(all).size).toBe(100);
    expect(s.val).toHaveLength(20);
    expect(s.test).toHaveLength(20);
  });

  it('is reproducible for the same seed', () => {
    expect(splitIndices(50, F, 9)).toEqual(splitIndices(50, F, 9));
    expect(splitIndices(50, F, 9).train).not.toEqual(splitIndices(50, F, 10).train);
  });

  it('stratifies so each class appears in every split', () => {
    const labels = [...Array(40).fill(0), ...Array(40).fill(1), ...Array(10).fill(2)];
    const s = splitIndices(labels.length, F, 4, labels);
    for (const part of [s.train, s.val, s.test]) {
      const classes = new Set(part.map((i) => labels[i]));
      expect(classes.size).toBe(3);
    }
    expect([...s.train, ...s.val, ...s.test]).toHaveLength(labels.length);
  });

  it('rejects non-positive fractions', () => {
    expect(() => splitIndices(10, { train: 1, val: 0, test: 0 }, 1)).toThrow();
  });
});

describe('leakage-safe preprocessing', () => {
  it('fits statistics on training rows only', () => {
    const pre = fitPreprocessor([[1], [3], [null]], 1);
    expect(pre.means[0]).toBe(2);
    expect(pre.stds[0]).toBe(1);
    const constant = fitPreprocessor([[5], [5]], 1);
    expect(constant.stds[0]).toBe(1);
  });

  it('does not let validation/test rows influence the scaler', () => {
    const lines = ['x,y'];
    for (let i = 0; i < 40; i++) lines.push(`${i},${i * 2}`);
    const { table } = parseCsv(lines.join('\n'));
    const raw = selectData(table, ['x'], 'y', 'regression', 'drop');
    const a = buildSplitData(raw, 5);

    // Make the held-out rows extreme: the training-fitted scaler must not move.
    const trainIdx = splitIndices(raw.X.length, F, 5);
    const tampered = { ...raw, X: raw.X.map((r, i) => (trainIdx.train.includes(i) ? r : [1e6 + i])) };
    const b = buildSplitData(tampered, 5);
    expect(b.preprocessor).toEqual(a.preprocessor);
    expect(b.targetScaler).toEqual(a.targetScaler);
  });

  it('imputes missing features with the training mean (0 after scaling)', () => {
    const lines = ['a,b,y'];
    for (let i = 0; i < 40; i++) lines.push(`${i},${i % 7},${i}`);
    lines.push('5,,99');
    const { table } = parseCsv(lines.join('\n'));
    const kept = selectData(table, ['a', 'b'], 'y', 'regression', 'impute-mean');
    expect(kept.X).toHaveLength(41);
    expect(kept.droppedRows).toBe(0);
    const dropped = selectData(table, ['a', 'b'], 'y', 'regression', 'drop');
    expect(dropped.X).toHaveLength(40);
    expect(dropped.droppedRows).toBe(1);
    const data = buildSplitData(kept, 2);
    const all = [...data.train.X, ...data.val.X, ...data.test.X];
    expect(all.every((row) => row.every((v) => Number.isFinite(v)))).toBe(true);
  });
});

describe('selectData validation', () => {
  const csv = (() => {
    const lines = ['f1,f2,label,text'];
    for (let i = 0; i < 30; i++) lines.push(`${i},${i % 5},${i % 2 === 0 ? 'a' : 'b'},word${i}`);
    return parseCsv(lines.join('\n')).table;
  })();

  it('rejects the target used as a feature, non-numeric features and missing columns', () => {
    expect(() => selectData(csv, ['f1', 'label'], 'label', 'classification', 'drop')).toThrow(DataError);
    expect(() => selectData(csv, ['text'], 'label', 'classification', 'drop')).toThrow(DataError);
    expect(() => selectData(csv, ['nope'], 'label', 'classification', 'drop')).toThrow(DataError);
    expect(() => selectData(csv, [], 'label', 'classification', 'drop')).toThrow(DataError);
  });

  it('rejects regression on a categorical target', () => {
    expect(() => selectData(csv, ['f1'], 'label', 'regression', 'drop')).toThrow(DataError);
  });

  it('builds sorted class names for classification', () => {
    const raw = selectData(csv, ['f1', 'f2'], 'label', 'classification', 'drop');
    expect(raw.classNames).toEqual(['a', 'b']);
    expect(raw.y).toHaveLength(30);
  });

  it('rejects too few rows and tiny classes', () => {
    const small = parseCsv('f,y\n1,a\n2,b\n3,a\n').table;
    expect(() => selectData(small, ['f'], 'y', 'classification', 'drop')).toThrow(DataError);
  });
});

describe('suggestConfig', () => {
  it('picks the last column as target and guesses the task from it', async () => {
    const { suggestConfig } = await import('../src/ml/prepare');
    const reg = parseCsv(`a,b,y\n${Array.from({ length: 30 }, (_, i) => `${i},${i % 3},${i * 1.5}`).join('\n')}`).table;
    expect(suggestConfig(reg)).toEqual({ task: 'regression', features: ['a', 'b'], target: 'y' });
    const cls = parseCsv(`a,name,y\n${Array.from({ length: 30 }, (_, i) => `${i},n${i},${i % 2 ? 'x' : 'z'}`).join('\n')}`).table;
    const s = suggestConfig(cls);
    expect(s.task).toBe('classification');
    expect(s.features).toEqual(['a']); // the text column is not offered as a feature
    expect(s.target).toBe('y');
  });
});
