import { isClassificationMetrics, type TrainedModel } from './types';

export interface Explanation {
  headline: string;
  points: string[];
  warnings: string[];
}

const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
const num = (v: number): string => (Math.abs(v) >= 100 ? v.toFixed(1) : v.toPrecision(3));

/**
 * Turn raw metrics into plain-language guidance. Written to avoid overclaiming:
 * it always compares against a baseline, flags over/underfitting and warns when
 * the evaluation set is too small for the number to be trusted.
 *
 * @param baseline accuracy of always predicting the most common class (classification only)
 */
export function explainModel(model: TrainedModel, baseline?: number): Explanation {
  const points: string[] = [];
  const warnings: string[] = [];
  const { train, val, test } = model.report;

  if (model.stoppedEarly) {
    warnings.push('Training was stopped before all epochs finished, so the model may not have fully learned yet.');
  }

  let headline: string;

  if (isClassificationMetrics(train) && isClassificationMetrics(val) && isClassificationMetrics(test)) {
    headline = `On the ${test.n} test rows it had never seen, the model was right ${pct(test.accuracy)} of the time.`;

    if (baseline !== undefined) {
      if (test.accuracy <= baseline + 0.02) {
        warnings.push(
          `That is no better than always guessing the most common class (${pct(baseline)}). The model has not learned anything useful from these features.`,
        );
      } else {
        points.push(`For comparison, always guessing the most common class would score ${pct(baseline)}, so the model is genuinely learning something.`);
      }
    }
    const gap = train.accuracy - val.accuracy;
    if (gap > 0.1) {
      warnings.push(
        `Overfitting: accuracy is ${pct(train.accuracy)} on training data but only ${pct(val.accuracy)} on validation data. The model is memorising training rows. Try a simpler model, more regularisation or fewer epochs.`,
      );
    } else if (train.accuracy < 0.7 && val.accuracy < 0.7 && (baseline === undefined || val.accuracy < baseline + 0.15)) {
      warnings.push('Underfitting: the score is low even on the training data. Try a more flexible model, more epochs or more informative features.');
    } else {
      points.push(`Training (${pct(train.accuracy)}), validation (${pct(val.accuracy)}) and test (${pct(test.accuracy)}) scores are close together, which is a healthy sign.`);
    }
    if (Math.abs(val.accuracy - test.accuracy) > 0.1) {
      points.push('Validation and test scores differ noticeably. With small datasets scores are noisy, so do not read too much into small differences.');
    }
    points.push(`Macro precision ${pct(test.macroPrecision)}, recall ${pct(test.macroRecall)} and F1 ${pct(test.macroF1)} average over classes so that rare classes count as much as common ones.`);
    if (test.n < 50) {
      warnings.push(
        `The test set has only ${test.n} rows, so one extra mistake changes accuracy by about ${(100 / Math.max(1, test.n)).toFixed(1)} points. Treat the number as a rough estimate.`,
      );
    }
    if (test.accuracy === 1) {
      warnings.push('A perfect test score on a small or easy dataset does not mean the model will be perfect on new data.');
    }
  } else if (!isClassificationMetrics(train) && !isClassificationMetrics(val) && !isClassificationMetrics(test)) {
    headline = `On the ${test.n} test rows it had never seen, the typical error (RMSE) was ${num(test.rmse)} ${model.targetName} units; the average absolute error (MAE) was ${num(test.mae)}.`;
    if (test.r2 < 0) {
      warnings.push(`R² is ${num(test.r2)}: the model predicts worse than simply always guessing the average. It is not useful yet.`);
    } else if (test.r2 < 0.3) {
      warnings.push(`R² is only ${num(test.r2)}: the model explains little of the variation in ${model.targetName}.`);
    } else {
      points.push(`R² is ${num(test.r2)}: the model explains about ${pct(test.r2)} of the variation in ${model.targetName} on unseen rows (1.0 would be perfect, 0 is the same as guessing the average).`);
    }
    if (train.r2 - val.r2 > 0.15) {
      warnings.push(
        `Overfitting: R² is ${num(train.r2)} on training data but ${num(val.r2)} on validation data. Try a simpler model, more regularisation or fewer epochs.`,
      );
    } else if (train.r2 < 0.3 && val.r2 < 0.3) {
      warnings.push('Underfitting: even the training data is fitted poorly. A straight-line model may be too simple for this data; try a neural network.');
    }
    points.push(`Errors are in the same units as ${model.targetName}, so RMSE ${num(test.rmse)} means predictions are typically that far from the truth. RMSE penalises large misses more than MAE.`);
    if (test.n < 50) {
      warnings.push(`The test set has only ${test.n} rows, so these error estimates are rough.`);
    }
  } else {
    headline = 'Results are available for the training, validation and test sets.';
  }

  points.push('Training data is used to learn, validation data to compare settings, and test data only once at the end for an honest final score.');
  warnings.push('These numbers describe this dataset only. A different sample, population or time period can behave differently.');
  return { headline, points, warnings };
}
