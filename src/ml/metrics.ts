import type { ClassificationMetrics, RegressionMetrics } from './types';

function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function confusionMatrix(yTrue: number[], yPred: number[], numClasses: number): number[][] {
  if (yTrue.length !== yPred.length) throw new Error('yTrue and yPred must have the same length.');
  const m = Array.from({ length: numClasses }, () => new Array<number>(numClasses).fill(0));
  for (let i = 0; i < yTrue.length; i++) {
    const t = yTrue[i];
    const p = yPred[i];
    if (t >= 0 && t < numClasses && p >= 0 && p < numClasses) m[t][p]++;
  }
  return m;
}

/** Accuracy plus macro-averaged precision / recall / F1 (each class counts equally). */
export function classificationMetrics(yTrue: number[], yPred: number[], numClasses: number): ClassificationMetrics {
  const confusion = confusionMatrix(yTrue, yPred, numClasses);
  const n = yTrue.length;
  let correct = 0;
  const perClass = confusion.map((row, c) => {
    const tp = row[c];
    const support = row.reduce((a, b) => a + b, 0);
    const predicted = confusion.reduce((sum, r) => sum + r[c], 0);
    correct += tp;
    const precision = safeDiv(tp, predicted);
    const recall = safeDiv(tp, support);
    return { precision, recall, f1: safeDiv(2 * precision * recall, precision + recall), support };
  });
  const mean = (pick: (c: (typeof perClass)[number]) => number) =>
    safeDiv(
      perClass.reduce((s, c) => s + pick(c), 0),
      perClass.length,
    );
  return {
    accuracy: safeDiv(correct, n),
    macroPrecision: mean((c) => c.precision),
    macroRecall: mean((c) => c.recall),
    macroF1: mean((c) => c.f1),
    confusion,
    perClass,
    n,
  };
}

export function regressionMetrics(yTrue: number[], yPred: number[]): RegressionMetrics {
  if (yTrue.length !== yPred.length) throw new Error('yTrue and yPred must have the same length.');
  const n = yTrue.length;
  if (n === 0) return { mae: 0, rmse: 0, r2: 0, n: 0 };
  let abs = 0;
  let sq = 0;
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const e = yTrue[i] - yPred[i];
    abs += Math.abs(e);
    sq += e * e;
    mean += yTrue[i];
  }
  mean /= n;
  let total = 0;
  for (let i = 0; i < n; i++) total += (yTrue[i] - mean) ** 2;
  // R² can be negative: the model is then worse than always predicting the mean.
  const r2 = total === 0 ? 0 : 1 - sq / total;
  return { mae: abs / n, rmse: Math.sqrt(sq / n), r2, n };
}

/** Index of the largest value. */
export function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}
