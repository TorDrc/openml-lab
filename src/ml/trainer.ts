import { fitKnn } from './knn';
import { argmax, classificationMetrics, regressionMetrics } from './metrics';
import { fitRidge, ridgePredictor } from './ridge';
import { isTfAlgorithm, trainTfModel } from './tfModels';
import {
  DEFAULT_PARAMS,
  type AlgorithmId,
  type AlgorithmParams,
  type EpochLog,
  type EvaluationReport,
  type Metrics,
  type Predictor,
  type SplitData,
  type SplitSet,
  type Task,
  type TrainedModel,
} from './types';

export interface AlgorithmInfo {
  id: AlgorithmId;
  task: Task;
  name: string;
  /** Does it learn iteratively (so a loss curve and Stop button make sense)? */
  iterative: boolean;
  uses: 'TensorFlow.js' | 'TypeScript';
  summary: string;
  /** Which parameters the UI should expose. */
  params: (keyof AlgorithmParams)[];
}

export const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'logistic',
    task: 'classification',
    name: 'Logistic regression (softmax)',
    iterative: true,
    uses: 'TensorFlow.js',
    summary: 'Learns one straight-line boundary per class. Fast and easy to interpret, but cannot bend around curved shapes.',
    params: ['learningRate', 'epochs', 'batchSize', 'l2'],
  },
  {
    id: 'mlp-classifier',
    task: 'classification',
    name: 'Neural network (MLP)',
    iterative: true,
    uses: 'TensorFlow.js',
    summary: 'Layers of small units that can learn curved boundaries. More flexible, so it can also overfit small datasets.',
    params: ['learningRate', 'epochs', 'batchSize', 'hiddenUnits', 'hiddenLayers', 'l2'],
  },
  {
    id: 'knn',
    task: 'classification',
    name: 'k-nearest neighbours',
    iterative: false,
    uses: 'TypeScript',
    summary: 'Predicts by voting among the k most similar training rows. No training loop; k controls how smooth the boundary is.',
    params: ['k'],
  },
  {
    id: 'ridge',
    task: 'regression',
    name: 'Ridge regression (closed form)',
    iterative: false,
    uses: 'TypeScript',
    summary: 'Fits the best straight-line (linear) relationship in one calculation; lambda shrinks coefficients to reduce overfitting.',
    params: ['lambda'],
  },
  {
    id: 'linear-sgd',
    task: 'regression',
    name: 'Linear regression (gradient descent)',
    iterative: true,
    uses: 'TensorFlow.js',
    summary: 'The same straight-line model, found step by step with gradient descent so you can watch the loss fall.',
    params: ['learningRate', 'epochs', 'batchSize', 'l2'],
  },
  {
    id: 'mlp-regressor',
    task: 'regression',
    name: 'Neural network (MLP)',
    iterative: true,
    uses: 'TensorFlow.js',
    summary: 'Layers of small units that can follow curves, not just straight lines. Flexible, and can overfit small datasets.',
    params: ['learningRate', 'epochs', 'batchSize', 'hiddenUnits', 'hiddenLayers', 'l2'],
  },
];

/** Sensible starting parameters per algorithm (applied when the user picks it). */
const ALGORITHM_DEFAULTS: Partial<Record<AlgorithmId, Partial<AlgorithmParams>>> = {
  logistic: { learningRate: 0.1, epochs: 60, batchSize: 16 },
  'mlp-classifier': { learningRate: 0.03, epochs: 100, batchSize: 16, hiddenUnits: 16, hiddenLayers: 1 },
  knn: { k: 5 },
  ridge: { lambda: 1 },
  'linear-sgd': { learningRate: 0.05, epochs: 100, batchSize: 16 },
  'mlp-regressor': { learningRate: 0.02, epochs: 150, batchSize: 16, hiddenUnits: 16, hiddenLayers: 1 },
};

export function defaultParamsFor(id: AlgorithmId): AlgorithmParams {
  return { ...DEFAULT_PARAMS, ...ALGORITHM_DEFAULTS[id] };
}

export function algorithmsFor(task: Task): AlgorithmInfo[] {
  return ALGORITHMS.filter((a) => a.task === task);
}

export function getAlgorithm(id: AlgorithmId): AlgorithmInfo {
  const found = ALGORITHMS.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown algorithm: ${id}`);
  return found;
}

/** Evaluate a predictor on one split. Regression metrics are reported in the ORIGINAL target units. */
export function evaluateSplit(predictor: Predictor, data: SplitData, set: SplitSet): Metrics {
  const pred = predictor.predict(set.X);
  if (data.task === 'classification') {
    return classificationMetrics(set.y, pred, data.classNames.length);
  }
  const { mean, std } = data.targetScaler;
  return regressionMetrics(
    set.y.map((v) => v * std + mean),
    pred.map((v) => v * std + mean),
  );
}

export function evaluateAll(predictor: Predictor, data: SplitData): EvaluationReport {
  return {
    train: evaluateSplit(predictor, data, data.train),
    val: evaluateSplit(predictor, data, data.val),
    test: evaluateSplit(predictor, data, data.test),
  };
}

export interface TrainOptions {
  algorithm: AlgorithmId;
  params: AlgorithmParams;
  data: SplitData;
  seed?: number;
  onEpoch?: (log: EpochLog, totalEpochs: number) => void;
  signal?: AbortSignal;
}

function featureRanges(data: SplitData): { min: number; max: number }[] {
  return data.featureNames.map((_, j) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const row of data.train.X) {
      lo = Math.min(lo, row[j]);
      hi = Math.max(hi, row[j]);
    }
    const { means, stds } = data.preprocessor;
    return { min: lo * stds[j] + means[j], max: hi * stds[j] + means[j] };
  });
}

/** Train a model, then evaluate it once on all three splits. */
export async function trainModel(options: TrainOptions): Promise<TrainedModel> {
  const { algorithm, params, data, signal } = options;
  const seed = options.seed ?? data.seed;
  const info = getAlgorithm(algorithm);
  if (info.task !== data.task) throw new Error(`${info.name} cannot be used for ${data.task}.`);

  let predictor: Predictor;
  let history: EpochLog[] = [];
  let stoppedEarly = false;

  if (isTfAlgorithm(algorithm)) {
    const result = await trainTfModel(algorithm, data, params, seed, options.onEpoch, signal);
    predictor = result.predictor;
    history = result.history;
    stoppedEarly = result.stoppedEarly;
  } else if (algorithm === 'knn') {
    predictor = fitKnn(data.train.X, data.train.y, data.classNames.length, params.k);
  } else {
    predictor = ridgePredictor(fitRidge(data.train.X, data.train.y, params.lambda));
  }

  return {
    algorithm,
    task: data.task,
    predictor,
    featureNames: data.featureNames,
    targetName: data.targetName,
    classNames: data.classNames,
    preprocessor: data.preprocessor,
    targetScaler: data.targetScaler,
    featureRanges: featureRanges(data),
    params: { ...params },
    history,
    report: evaluateAll(predictor, data),
    stoppedEarly,
  };
}

/** Accuracy of always predicting the most common training class — the baseline a classifier must beat. */
export function majorityBaseline(data: SplitData): number {
  if (data.task !== 'classification') return 0;
  const counts = new Array<number>(data.classNames.length).fill(0);
  for (const c of data.train.y) counts[c]++;
  const majority = argmax(counts);
  return data.test.y.filter((c) => c === majority).length / Math.max(1, data.test.y.length);
}
