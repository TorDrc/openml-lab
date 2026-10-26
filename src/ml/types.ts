export type Task = 'classification' | 'regression';
export type MissingStrategy = 'drop' | 'impute-mean';

export type AlgorithmId = 'logistic' | 'mlp-classifier' | 'knn' | 'linear-sgd' | 'ridge' | 'mlp-regressor';

export interface AlgorithmParams {
  learningRate: number;
  epochs: number;
  batchSize: number;
  hiddenUnits: number;
  hiddenLayers: number;
  l2: number;
  k: number;
  lambda: number;
}

export const DEFAULT_PARAMS: AlgorithmParams = {
  learningRate: 0.05,
  epochs: 60,
  batchSize: 32,
  hiddenUnits: 16,
  hiddenLayers: 1,
  l2: 0,
  k: 5,
  lambda: 1,
};

/** Rows with possibly-missing numeric features; the target is always present. */
export interface RawData {
  task: Task;
  featureNames: string[];
  targetName: string;
  X: (number | null)[][];
  /** Class index (classification) or numeric value (regression). */
  y: number[];
  classNames: string[];
  /** Number of rows removed because of missing values or a missing target. */
  droppedRows: number;
}

export interface Preprocessor {
  /** Mean of each feature, computed on the TRAINING split only. */
  means: number[];
  /** Standard deviation of each feature (training split only; 1 when constant). */
  stds: number[];
}

export interface TargetScaler {
  mean: number;
  std: number;
}

export interface SplitSet {
  X: number[][];
  y: number[];
}

export interface SplitData {
  task: Task;
  featureNames: string[];
  targetName: string;
  classNames: string[];
  train: SplitSet;
  val: SplitSet;
  test: SplitSet;
  preprocessor: Preprocessor;
  /** Regression only: target standardisation fitted on the training split. */
  targetScaler: TargetScaler;
  seed: number;
}

export interface Predictor {
  /** Predictions for already-standardised feature rows. Class index or value (standardised target for regression). */
  predict(X: number[][]): number[];
  /** Class probabilities for already-standardised rows (classification only). */
  predictProba?(X: number[][]): number[][];
  dispose(): void;
}

export interface EpochLog {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  /** Accuracy for classification; R² for regression. */
  trainScore: number;
  valScore: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  confusion: number[][];
  perClass: { precision: number; recall: number; f1: number; support: number }[];
  n: number;
}

export interface RegressionMetrics {
  mae: number;
  rmse: number;
  r2: number;
  n: number;
}

export type Metrics = ClassificationMetrics | RegressionMetrics;

export interface EvaluationReport {
  train: Metrics;
  val: Metrics;
  test: Metrics;
}

export interface TrainedModel {
  algorithm: AlgorithmId;
  task: Task;
  predictor: Predictor;
  featureNames: string[];
  targetName: string;
  classNames: string[];
  preprocessor: Preprocessor;
  targetScaler: TargetScaler;
  /** Feature ranges (min, max) of the raw training data, for input sliders and plots. */
  featureRanges: { min: number; max: number }[];
  params: AlgorithmParams;
  history: EpochLog[];
  report: EvaluationReport;
  stoppedEarly: boolean;
}

export function isClassificationMetrics(m: Metrics): m is ClassificationMetrics {
  return 'accuracy' in m;
}
