import { argmax } from './metrics';
import { standardiseRow } from './split';
import type { TrainedModel } from './types';

export interface RowPrediction {
  task: TrainedModel['task'];
  /** Classification: predicted class name. */
  label?: string;
  classIndex?: number;
  /** Classification: probability per class (when the algorithm supports it). */
  probabilities?: number[];
  /** Regression: predicted value in the original target units. */
  value?: number;
}

/** Predict for one row of RAW (unscaled) feature values, in the order of model.featureNames. */
export function predictRow(model: TrainedModel, values: number[]): RowPrediction {
  if (values.length !== model.featureNames.length) {
    throw new Error(`Expected ${model.featureNames.length} feature value(s) but got ${values.length}.`);
  }
  if (values.some((v) => !Number.isFinite(v))) throw new Error('All feature values must be finite numbers.');
  const x = [standardiseRow(model.preprocessor, values)];
  if (model.task === 'regression') {
    const [z] = model.predictor.predict(x);
    return { task: 'regression', value: z * model.targetScaler.std + model.targetScaler.mean };
  }
  const probabilities = model.predictor.predictProba?.(x)[0];
  const classIndex = probabilities ? argmax(probabilities) : model.predictor.predict(x)[0];
  return { task: 'classification', classIndex, label: model.classNames[classIndex], probabilities };
}

export interface BoundaryGrid {
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Predicted class index per cell, row-major from the TOP row (largest y) down. */
  classes: number[];
  /** Confidence (max probability) per cell when available, otherwise 1. */
  confidence: number[];
}

/**
 * Evaluate a classifier on a regular grid over two chosen features. All other
 * features are held at their training mean, so for models with more than two
 * features this is a 2-D *slice* through the decision surface, not the whole of it.
 */
export function boundaryGrid(
  model: TrainedModel,
  featureX: number,
  featureY: number,
  resolution = 60,
  padding = 0.1,
): BoundaryGrid {
  if (model.task !== 'classification') throw new Error('Decision boundaries are only available for classification.');
  const rx = model.featureRanges[featureX];
  const ry = model.featureRanges[featureY];
  const padX = (rx.max - rx.min || 1) * padding;
  const padY = (ry.max - ry.min || 1) * padding;
  const xMin = rx.min - padX;
  const xMax = rx.max + padX;
  const yMin = ry.min - padY;
  const yMax = ry.max + padY;

  const points: number[][] = [];
  for (let r = 0; r < resolution; r++) {
    const y = yMax - ((yMax - yMin) * (r + 0.5)) / resolution;
    for (let c = 0; c < resolution; c++) {
      const x = xMin + ((xMax - xMin) * (c + 0.5)) / resolution;
      const raw = model.preprocessor.means.slice();
      raw[featureX] = x;
      raw[featureY] = y;
      points.push(standardiseRow(model.preprocessor, raw));
    }
  }
  const proba = model.predictor.predictProba?.(points);
  const classes = proba ? proba.map(argmax) : model.predictor.predict(points);
  const confidence = proba ? proba.map((p) => Math.max(...p)) : classes.map(() => 1);
  return { width: resolution, height: resolution, xMin, xMax, yMin, yMax, classes, confidence };
}

/** Sample a regression model along one feature (others at their training mean) for plotting. */
export function regressionCurve(
  model: TrainedModel,
  feature: number,
  points = 80,
): { x: number[]; y: number[] } {
  if (model.task !== 'regression') throw new Error('Curves are only available for regression.');
  const range = model.featureRanges[feature];
  const xs: number[] = [];
  const rows: number[][] = [];
  for (let i = 0; i < points; i++) {
    const x = range.min + ((range.max - range.min) * i) / (points - 1);
    const raw = model.preprocessor.means.slice();
    raw[feature] = x;
    xs.push(x);
    rows.push(standardiseRow(model.preprocessor, raw));
  }
  const z = model.predictor.predict(rows);
  return { x: xs, y: z.map((v) => v * model.targetScaler.std + model.targetScaler.mean) };
}
