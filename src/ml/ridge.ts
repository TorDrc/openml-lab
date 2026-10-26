import type { Predictor } from './types';

/** Solve A x = b for a small symmetric positive-definite system (Gaussian elimination with pivoting). */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-12) throw new Error('The features are linearly dependent; try a larger lambda or remove a column.');
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = sum / M[r][r];
  }
  return x;
}

export interface RidgeFit {
  weights: number[];
  bias: number;
}

/**
 * Ridge regression via the closed-form normal equations:
 * (XᵀX + λI) w = Xᵀy. The intercept is not penalised. Inputs are standardised.
 */
export function fitRidge(X: number[][], y: number[], lambda: number): RidgeFit {
  if (X.length === 0) throw new Error('Ridge regression needs at least one training row.');
  const p = X[0].length;
  const lam = Math.max(0, lambda);
  // Augment with a constant column for the intercept (last index).
  const size = p + 1;
  const A = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const b = new Array<number>(size).fill(0);
  for (let i = 0; i < X.length; i++) {
    const row = [...X[i], 1];
    for (let r = 0; r < size; r++) {
      b[r] += row[r] * y[i];
      for (let c = 0; c < size; c++) A[r][c] += row[r] * row[c];
    }
  }
  for (let j = 0; j < p; j++) A[j][j] += lam;
  const w = solveLinearSystem(A, b);
  return { weights: w.slice(0, p), bias: w[p] };
}

export function ridgePredictor(fit: RidgeFit): Predictor {
  return {
    predict: (rows) => rows.map((r) => r.reduce((s, v, j) => s + v * fit.weights[j], fit.bias)),
    dispose: () => undefined,
  };
}
