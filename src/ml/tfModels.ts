import type * as TFTypes from '@tensorflow/tfjs';
import { argmax, regressionMetrics } from './metrics';
import type { AlgorithmId, AlgorithmParams, EpochLog, Predictor, SplitData } from './types';

export type TF = typeof TFTypes;

let tfPromise: Promise<TF> | null = null;

/**
 * TensorFlow.js is large (several MB), so it is loaded lazily the first time a
 * neural / gradient-trained model is requested. Pages that do not train never pay for it.
 */
export function loadTf(): Promise<TF> {
  tfPromise ??= import('@tensorflow/tfjs').then((m) => m as TF);
  return tfPromise;
}

export const TF_ALGORITHMS: AlgorithmId[] = ['logistic', 'mlp-classifier', 'linear-sgd', 'mlp-regressor'];

export function isTfAlgorithm(id: AlgorithmId): boolean {
  return TF_ALGORITHMS.includes(id);
}

function buildModel(tf: TF, algorithm: AlgorithmId, numFeatures: number, numClasses: number, p: AlgorithmParams, seed: number) {
  const model = tf.sequential();
  const reg = p.l2 > 0 ? tf.regularizers.l2({ l2: p.l2 }) : undefined;
  let counter = 0;
  const init = () => tf.initializers.glorotUniform({ seed: seed + counter++ });
  const hidden = algorithm === 'mlp-classifier' || algorithm === 'mlp-regressor';
  const isClassifier = algorithm === 'logistic' || algorithm === 'mlp-classifier';

  let inputShape: number[] | undefined = [numFeatures];
  if (hidden) {
    for (let i = 0; i < Math.max(1, p.hiddenLayers); i++) {
      model.add(
        tf.layers.dense({
          units: Math.max(1, Math.floor(p.hiddenUnits)),
          activation: 'relu',
          inputShape,
          kernelInitializer: init(),
          kernelRegularizer: reg,
        }),
      );
      inputShape = undefined;
    }
  }
  model.add(
    tf.layers.dense({
      units: isClassifier ? numClasses : 1,
      activation: isClassifier ? 'softmax' : 'linear',
      inputShape,
      kernelInitializer: init(),
      kernelRegularizer: reg,
    }),
  );
  model.compile({
    optimizer: tf.train.adam(p.learningRate),
    loss: isClassifier ? 'categoricalCrossentropy' : 'meanSquaredError',
  });
  return { model, isClassifier };
}

export interface TfTrainResult {
  predictor: Predictor;
  history: EpochLog[];
  stoppedEarly: boolean;
}

/**
 * Train a gradient-based model in the browser with TensorFlow.js.
 * Data order is fixed by the seeded split (no extra shuffling), so runs are
 * repeatable on the same backend; tiny numerical differences between backends
 * (CPU vs WebGL) mean results are close, not guaranteed bit-identical.
 */
export async function trainTfModel(
  algorithm: AlgorithmId,
  data: SplitData,
  params: AlgorithmParams,
  seed: number,
  onEpoch?: (log: EpochLog, totalEpochs: number) => void,
  signal?: AbortSignal,
): Promise<TfTrainResult> {
  const tf = await loadTf();
  const numFeatures = data.featureNames.length;
  const numClasses = Math.max(2, data.classNames.length);
  const { model, isClassifier } = buildModel(tf, algorithm, numFeatures, numClasses, params, seed);

  const toY = (y: number[]) => (isClassifier ? tf.oneHot(tf.tensor1d(y, 'int32'), numClasses).cast('float32') : tf.tensor2d(y, [y.length, 1]));
  const xTrain = tf.tensor2d(data.train.X);
  const yTrain = toY(data.train.y);
  const xVal = tf.tensor2d(data.val.X);
  const yVal = toY(data.val.y);

  const history: EpochLog[] = [];
  const score = (X: number[][], y: number[]): number =>
    tf.tidy(() => {
      const out = model.predict(tf.tensor2d(X)) as TFTypes.Tensor;
      const values = out.arraySync() as number[][];
      if (isClassifier) {
        const predicted = values.map(argmax);
        return predicted.reduce((s, p, i) => s + (p === y[i] ? 1 : 0), 0) / y.length;
      }
      return regressionMetrics(
        y,
        values.map((v) => v[0]),
      ).r2;
    });

  let stoppedEarly = false;
  try {
    await model.fit(xTrain, yTrain, {
      epochs: Math.max(1, Math.floor(params.epochs)),
      batchSize: Math.max(1, Math.floor(params.batchSize)),
      shuffle: false,
      validationData: [xVal, yVal],
      verbose: 0,
      callbacks: {
        onEpochEnd: async (epoch: number, logs?: Record<string, unknown>) => {
          const log: EpochLog = {
            epoch: epoch + 1,
            trainLoss: Number(logs?.loss ?? NaN),
            valLoss: Number(logs?.val_loss ?? NaN),
            trainScore: score(data.train.X, data.train.y),
            valScore: score(data.val.X, data.val.y),
          };
          history.push(log);
          onEpoch?.(log, params.epochs);
          if (signal?.aborted) {
            stoppedEarly = true;
            model.stopTraining = true;
          }
          // Yield so the UI can repaint and the Stop button stays responsive.
          await tf.nextFrame();
        },
      },
    });
  } finally {
    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();
  }

  const run = (X: number[][]): number[][] =>
    tf.tidy(() => (model.predict(tf.tensor2d(X)) as TFTypes.Tensor).arraySync() as number[][]);

  const predictor: Predictor = isClassifier
    ? {
        predict: (X) => run(X).map(argmax),
        predictProba: (X) => run(X),
        dispose: () => model.dispose(),
      }
    : {
        predict: (X) => run(X).map((v) => v[0]),
        dispose: () => model.dispose(),
      };

  return { predictor, history, stoppedEarly };
}
