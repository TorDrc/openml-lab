import * as tf from '@tensorflow/tfjs';

export type ClassificationPrediction = {
  classIndex: number;
  label: string;
  confidence: number;
  probabilities: number[];
  predictionText: string;
};

export type RegressionPrediction = {
  prediction: number;
  featureValues: number[];
  metrics: { mae: number; rmse: number; r2: number };
};

export type TrainingOptions = {
  epochs?: number;
  learningRate?: number;
  validationSplit?: number;
  signal?: AbortSignal;
  onEpochEnd?: (epoch: number, stats: { loss: number; accuracy?: number; valLoss?: number; valAccuracy?: number }) => void;
};

export function createClassificationModel(inputSize: number, numClasses: number) {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [inputSize], units: 16, activation: 'relu' }),
      tf.layers.dense({ units: numClasses, activation: 'softmax' })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.04),
    loss: 'sparseCrossentropy',
    metrics: ['accuracy']
  });

  return model;
}

export function createRegressionModel(inputSize: number) {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [inputSize], units: 12, activation: 'relu' }),
      tf.layers.dense({ units: 1, activation: 'linear' })
    ]
  });

  model.compile({
    optimizer: tf.train.adam(0.03),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

export async function trainClassificationModel(
  features: number[][],
  labels: number[],
  options: TrainingOptions = {}
) {
  const inputSize = features[0]?.length ?? 0;
  const classCount = Math.max(...labels) + 1;
  const model = createClassificationModel(inputSize, classCount);

  model.compile({
    optimizer: tf.train.adam(options.learningRate ?? 0.04),
    loss: 'sparseCrossentropy',
    metrics: ['accuracy']
  });

  const xs = tf.tensor2d(features, [features.length, inputSize]);
  const ys = tf.tensor1d(labels, 'int32');
  const history = { loss: [] as number[], accuracy: [] as number[], valLoss: [] as number[], valAccuracy: [] as number[] };

  const epochs = options.epochs ?? 12;
  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    if (options.signal?.aborted) {
      xs.dispose();
      ys.dispose();
      throw new DOMException('Training aborted', 'AbortError');
    }

    const fitResult = await model.fit(xs, ys, {
      epochs: 1,
      validationSplit: options.validationSplit ?? 0.2,
      shuffle: true,
      verbose: 0
    });

    const loss = Number(fitResult.history.loss?.[0] ?? 0);
    const accuracy = Number(fitResult.history.acc?.[0] ?? 0);
    const valLoss = Number(fitResult.history.val_loss?.[0] ?? 0);
    const valAccuracy = Number(fitResult.history.val_acc?.[0] ?? 0);

    history.loss.push(loss);
    history.accuracy.push(accuracy);
    history.valLoss.push(valLoss);
    history.valAccuracy.push(valAccuracy);

    options.onEpochEnd?.(epoch, {
      loss,
      accuracy,
      valLoss,
      valAccuracy
    });
  }

  xs.dispose();
  ys.dispose();

  return { model, history };
}

export async function trainRegressionModel(
  features: number[][],
  targets: number[],
  options: TrainingOptions = {}
) {
  const model = createRegressionModel(features[0]?.length ?? 1);
  const xs = tf.tensor2d(features, [features.length, features[0].length]);
  const ys = tf.tensor1d(targets);

  const history = { loss: [] as number[], mae: [] as number[], valLoss: [] as number[], valMae: [] as number[] };
  const epochs = options.epochs ?? 18;

  for (let epoch = 1; epoch <= epochs; epoch += 1) {
    if (options.signal?.aborted) {
      xs.dispose();
      ys.dispose();
      throw new DOMException('Training aborted', 'AbortError');
    }

    const fitResult = await model.fit(xs, ys, {
      epochs: 1,
      validationSplit: options.validationSplit ?? 0.2,
      shuffle: true,
      verbose: 0
    });

    const loss = Number(fitResult.history.loss?.[0] ?? 0);
    const mae = Number(fitResult.history.mae?.[0] ?? 0);
    const valLoss = Number(fitResult.history.val_loss?.[0] ?? 0);
    const valMae = Number(fitResult.history.val_mae?.[0] ?? 0);

    history.loss.push(loss);
    history.mae.push(mae);
    history.valLoss.push(valLoss);
    history.valMae.push(valMae);

    options.onEpochEnd?.(epoch, { loss, valLoss });
  }

  xs.dispose();
  ys.dispose();

  return { model, history };
}

export function predictClassification(model: tf.LayersModel, input: number[], labels: string[] = []) {
  const tensor = tf.tensor2d([input]);
  const output = model.predict(tensor) as tf.Tensor;
  const probabilities = Array.from(output.dataSync());
  const classIndex = probabilities.indexOf(Math.max(...probabilities));
  const confidence = probabilities[classIndex] ?? 0;
  const label = labels[classIndex] ?? `class_${classIndex}`;

  tensor.dispose();
  output.dispose();

  return {
    classIndex,
    label,
    confidence,
    probabilities,
    predictionText: `${label} (${(confidence * 100).toFixed(1)}% confidence)`
  } satisfies ClassificationPrediction;
}

export async function predictRegression(model: tf.LayersModel, input: number[]) {
  const tensor = tf.tensor2d([input]);
  const value = model.predict(tensor) as tf.Tensor;
  const prediction = Number(value.dataSync()[0] ?? 0);
  const metrics = evaluateRegression([prediction], [prediction]);

  tensor.dispose();
  value.dispose();

  return {
    prediction,
    featureValues: input,
    metrics
  } satisfies RegressionPrediction;
}

export function evaluateClassification(actual: number[], predicted: number[]) {
  const length = actual.length;
  let correct = 0;
  let totalPositive = 0;
  let truePositive = 0;
  let falsePositive = 0;

  for (let index = 0; index < length; index += 1) {
    const actualLabel = actual[index];
    const predictedLabel = predicted[index];

    if (actualLabel === predictedLabel) {
      correct += 1;
    }

    if (predictedLabel === 1) {
      totalPositive += 1;
    }

    if (actualLabel === 1 && predictedLabel === 1) {
      truePositive += 1;
    }

    if (actualLabel === 0 && predictedLabel === 1) {
      falsePositive += 1;
    }
  }

  const accuracy = correct / Math.max(length, 1);
  const precision = totalPositive === 0 ? 0 : truePositive / totalPositive;
  const actualPositive = actual.filter((value) => value === 1).length;
  const recall = actualPositive === 0 ? 0 : truePositive / actualPositive;

  return { accuracy, precision, recall };
}

export function evaluateRegression(actual: number[], predicted: number[]) {
  const length = actual.length || 1;
  const mae = actual.reduce((sum, value, index) => sum + Math.abs(value - predicted[index]), 0) / length;
  const mse = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0) / length;
  const rmse = Math.sqrt(mse);
  const mean = actual.reduce((sum, value) => sum + value, 0) / length;
  const ssRes = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const ssTot = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { mae, mse, rmse, r2 };
}
