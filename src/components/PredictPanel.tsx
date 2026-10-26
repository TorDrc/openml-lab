import { useEffect, useMemo, useState } from 'react';
import { predictRow } from '../ml/predict';
import type { TrainedModel } from '../ml/types';
import { sanitizeText } from '../utils/sanitize';
import { Alert, Card, classColor, fmt, pct } from './ui';

/** Enter feature values and get an instant prediction from the trained model. */
export function PredictPanel({ model }: { model: TrainedModel }) {
  const defaults = useMemo(() => model.preprocessor.means.map((m) => fmt(m, 4)), [model]);
  const [values, setValues] = useState<string[]>(defaults);

  useEffect(() => setValues(defaults), [defaults]);

  const parsed = values.map((v) => (v.trim() === '' ? Number.NaN : Number(v)));
  const invalid = parsed.findIndex((v) => !Number.isFinite(v));

  const result = useMemo(() => {
    if (parsed.some((v) => !Number.isFinite(v))) return null;
    try {
      return predictRow(model, parsed);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, values]);

  return (
    <Card title="Try a prediction">
      <p className="muted">Change the numbers below; the model predicts instantly in your browser. Sliders use the range seen in the training data.</p>
      <div className="predict-grid">
        {model.featureNames.map((name, i) => {
          const range = model.featureRanges[i];
          const id = `predict-${i}`;
          const step = (range.max - range.min) / 100 || 0.01;
          return (
            <div key={name} className="predict-field">
              <label htmlFor={id}>{sanitizeText(name, 40)}</label>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                step="any"
                value={values[i] ?? ''}
                aria-invalid={invalid === i}
                onChange={(e) => setValues((vs) => vs.map((v, j) => (j === i ? e.target.value : v)))}
              />
              <input
                type="range"
                aria-label={`${sanitizeText(name, 40)} slider`}
                min={range.min}
                max={range.max}
                step={step}
                value={Number.isFinite(parsed[i]) ? Math.min(range.max, Math.max(range.min, parsed[i])) : range.min}
                onChange={(e) => setValues((vs) => vs.map((v, j) => (j === i ? fmt(Number(e.target.value), 4) : v)))}
              />
            </div>
          );
        })}
      </div>

      {invalid >= 0 && <Alert kind="error">Enter a number for “{sanitizeText(model.featureNames[invalid], 40)}”.</Alert>}

      {result && result.task === 'classification' && (
        <div className="prediction" aria-live="polite">
          <p>
            Predicted {sanitizeText(model.targetName, 40)}: <strong className="prediction-value">{sanitizeText(result.label ?? '', 40)}</strong>
          </p>
          {result.probabilities ? (
            <ul className="proba-list">
              {result.probabilities.map((p, i) => (
                <li key={model.classNames[i]}>
                  <span className="proba-name">{sanitizeText(model.classNames[i], 30)}</span>
                  <span className="proba-bar" aria-hidden="true">
                    <span style={{ width: `${(p * 100).toFixed(1)}%`, background: classColor(i) }} />
                  </span>
                  <span className="proba-value">{pct(p)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">This algorithm does not output confidence scores.</p>
          )}
          <p className="muted">
            Confidence is how strongly the model favours a class — it is not a guarantee. Inputs far outside the training range are
            extrapolations and should not be trusted.
          </p>
        </div>
      )}

      {result && result.task === 'regression' && (
        <div className="prediction" aria-live="polite">
          <p>
            Predicted {sanitizeText(model.targetName, 40)}: <strong className="prediction-value">{fmt(result.value ?? 0, 4)}</strong>
          </p>
          <p className="muted">
            Typical error on unseen test rows (RMSE): {'rmse' in model.report.test ? fmt(model.report.test.rmse) : '–'}. Inputs outside the
            training range are extrapolations and may be unreliable.
          </p>
        </div>
      )}
    </Card>
  );
}
