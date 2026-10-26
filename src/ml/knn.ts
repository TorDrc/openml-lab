import type { Predictor } from './types';

/**
 * k-nearest-neighbours classifier (pure TypeScript, no TensorFlow.js needed).
 * Works on standardised features so no single feature dominates the distance.
 */
export function fitKnn(X: number[][], y: number[], numClasses: number, k: number): Predictor {
  if (X.length === 0) throw new Error('k-NN needs at least one training row.');
  const kk = Math.max(1, Math.min(Math.floor(k), X.length));

  const proba = (rows: number[][]): number[][] =>
    rows.map((q) => {
      // Keep the kk smallest squared distances with a simple insertion buffer.
      const best: { d: number; c: number }[] = [];
      for (let i = 0; i < X.length; i++) {
        let d = 0;
        const row = X[i];
        for (let j = 0; j < row.length; j++) {
          const diff = row[j] - q[j];
          d += diff * diff;
        }
        if (best.length < kk || d < best[best.length - 1].d) {
          let pos = best.length;
          while (pos > 0 && best[pos - 1].d > d) pos--;
          best.splice(pos, 0, { d, c: y[i] });
          if (best.length > kk) best.pop();
        }
      }
      const votes = new Array<number>(numClasses).fill(0);
      for (const b of best) votes[b.c] += 1;
      return votes.map((v) => v / best.length);
    });

  return {
    predict: (rows) =>
      proba(rows).map((p) => {
        let best = 0;
        for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
        return best;
      }),
    predictProba: proba,
    dispose: () => undefined,
  };
}
