import { describe, expect, it } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { createClassificationModel, evaluateClassification, evaluateRegression, predictClassification, trainClassificationModel } from '../src/ml/tfModels';

describe('Model utilities', () => {
  it('calculates classification metrics from actual and predicted labels', () => {
    const metrics = evaluateClassification([0, 1, 1, 0], [0, 1, 0, 0]);

    expect(metrics.accuracy).toBeCloseTo(0.75, 2);
    expect(metrics.precision).toBeCloseTo(0.5, 2);
    expect(metrics.recall).toBeCloseTo(1, 2);
  });

  it('evaluates regression metrics with finite values', () => {
    const metrics = evaluateRegression([1, 2, 3], [1, 2, 4]);

    expect(metrics.mae).toBeGreaterThan(0);
    expect(metrics.rmse).toBeGreaterThan(0);
    expect(metrics.r2).toBeLessThan(1);
  });

  it('trains a small classification model and predicts a label', async () => {
    const model = createClassificationModel(2, 2);
    const training = await trainClassificationModel(
      [
        [0.2, 0.9],
        [0.4, 0.8],
        [1.1, 0.1],
        [1.3, 0.2]
      ],
      [0, 0, 1, 1],
      { epochs: 2, learningRate: 0.05 }
    );

    const prediction = predictClassification(training.model, [0.3, 0.8], ['class_a', 'class_b']);

    expect(prediction.label).toMatch(/class_/);
    expect(prediction.probabilities.length).toBe(2);
    expect(trainClassificationModel).toBeTypeOf('function');
    model.dispose();
    training.model.dispose();
  });
});
