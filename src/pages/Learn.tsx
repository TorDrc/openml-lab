import { useMemo, useState } from 'react';
import { Card, PageHeader, fmt, pct } from '../components/ui';
import { getSampleDataset, sampleToTable } from '../data/datasets';
import { fitKnn } from '../ml/knn';
import { classificationMetrics, regressionMetrics } from '../ml/metrics';
import { selectData } from '../ml/prepare';
import { fitRidge, ridgePredictor } from '../ml/ridge';
import { buildSplitData } from '../ml/split';
import { Link } from '../utils/router';

/** Reproducible overfitting demo: k-NN on the two-moons data. Pure TypeScript, instant. */
function KnnDemo() {
  const [k, setK] = useState(1);
  const data = useMemo(() => {
    const ds = getSampleDataset('moons');
    const raw = selectData(sampleToTable(ds), ds.featureNames, ds.targetName, 'classification', 'drop');
    return buildSplitData(raw, 7);
  }, []);
  const scores = useMemo(() => {
    const model = fitKnn(data.train.X, data.train.y, 2, k);
    const score = (set: { X: number[][]; y: number[] }) => classificationMetrics(set.y, model.predict(set.X), 2).accuracy;
    return { train: score(data.train), val: score(data.val) };
  }, [data, k]);

  return (
    <Card title="Try it: k-nearest neighbours and overfitting">
      <p>
        The two-moons dataset has {data.train.y.length} training rows and {data.val.y.length} validation rows (seed 7). Each prediction is a vote
        among the <strong>k</strong> most similar training rows. Move the slider and compare the two scores.
      </p>
      <div className="param">
        <label htmlFor="knn-k">k = {k}</label>
        <input id="knn-k" type="range" min={1} max={40} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
      </div>
      <dl className="facts">
        <dt>Training accuracy</dt>
        <dd>{pct(scores.train)}</dd>
        <dt>Validation accuracy</dt>
        <dd>{pct(scores.val)}</dd>
        <dt>Gap (training − validation)</dt>
        <dd>{((scores.train - scores.val) * 100).toFixed(1)} points</dd>
      </dl>
      <p className="muted">
        With k = 1 every training row is its own nearest neighbour, so training accuracy is perfect by construction while validation accuracy is
        lower: the model memorises. A larger k gives smoother predictions and a smaller gap. Only the validation score tells you how the
        model handles new data.
      </p>
    </Card>
  );
}

function polyFeatures(x: number[], degree: number): number[][] {
  return x.map((v) => Array.from({ length: degree }, (_, d) => v ** (d + 1)));
}

/** Underfitting vs overfitting with polynomial degree on a noisy curve. */
function PolynomialDemo() {
  const [degree, setDegree] = useState(2);
  const data = useMemo(() => {
    const ds = getSampleDataset('curve');
    const raw = selectData(sampleToTable(ds), ds.featureNames, ds.targetName, 'regression', 'drop');
    // Use a small training set so overfitting is visible.
    const full = buildSplitData(raw, 3);
    return { train: { X: full.train.X.slice(0, 18), y: full.train.y.slice(0, 18) }, val: full.val, scaler: full.targetScaler };
  }, []);
  const result = useMemo(() => {
    try {
      const fit = fitRidge(polyFeatures(data.train.X.map((r) => r[0]), degree), data.train.y, 1e-3);
      const model = ridgePredictor(fit);
      const rmse = (X: number[][], y: number[]) =>
        regressionMetrics(
          y.map((v) => v * data.scaler.std),
          model.predict(polyFeatures(X.map((r) => r[0]), degree)).map((v) => v * data.scaler.std),
        ).rmse;
      return { train: rmse(data.train.X, data.train.y), val: rmse(data.val.X, data.val.y) };
    } catch {
      return null;
    }
  }, [data, degree]);

  return (
    <Card title="Try it: underfitting vs overfitting">
      <p>
        A curve with noise, fitted by a polynomial of the chosen degree using only {data.train.y.length} training points. Degree 1 is a straight line
        (too simple); a very high degree wiggles through the noise (too flexible).
      </p>
      <div className="param">
        <label htmlFor="poly-degree">Polynomial degree = {degree}</label>
        <input id="poly-degree" type="range" min={1} max={12} step={1} value={degree} onChange={(e) => setDegree(Number(e.target.value))} />
      </div>
      {result ? (
        <dl className="facts">
          <dt>Training RMSE</dt>
          <dd>{fmt(result.train)}</dd>
          <dt>Validation RMSE</dt>
          <dd>{fmt(result.val)}</dd>
        </dl>
      ) : (
        <p className="muted">This degree could not be fitted numerically with so few points.</p>
      )}
      <p className="muted">
        Lower is better. Training error keeps falling as the degree grows, but validation error stops improving and then rises: the classic
        overfitting signature. The noise (standard deviation 0.4) sets a floor that no model can go below on new data.
      </p>
    </Card>
  );
}

const LESSONS: { id: string; title: string; body: string[] }[] = [
  {
    id: 'classification',
    title: 'Classification',
    body: [
      'Classification predicts a category: which species is this flower, is this email spam or not.',
      'The model learns from labelled examples and outputs a class, often with a probability for each class. Accuracy, precision and recall measure how often it is right.',
    ],
  },
  {
    id: 'regression',
    title: 'Regression',
    body: [
      'Regression predicts a number: the price of a house, tomorrow’s temperature.',
      'Errors are measured in the units of the target: MAE is the average miss, RMSE punishes big misses more, and R² compares the model with simply guessing the average.',
    ],
  },
  {
    id: 'training',
    title: 'Training',
    body: [
      'Training adjusts a model’s internal numbers (weights) to reduce a loss — a score of how wrong the predictions are.',
      'Gradient-based models do this in small steps called epochs. A falling loss curve means the model is learning; a flat curve means it has stopped improving.',
    ],
  },
  {
    id: 'validation',
    title: 'Training, validation and test data',
    body: [
      'Training data teaches the model. Validation data is used while you experiment, to compare settings. Test data is kept aside and used once at the end for an honest estimate.',
      'Splitting before any preprocessing is essential. If averages or scaling are computed on all rows, information from the test rows leaks into training and the score looks better than reality. OpenML Lab fits them on training rows only.',
    ],
  },
  {
    id: 'overfitting',
    title: 'Overfitting and underfitting',
    body: [
      'Overfitting means the model memorises quirks and noise of the training data: great training score, worse validation score.',
      'Underfitting means the model is too simple to capture the pattern: poor scores everywhere. Try the interactive demos below.',
    ],
  },
  {
    id: 'prediction',
    title: 'Prediction',
    body: [
      'Prediction means using a trained model on new inputs. Confidence scores show how strongly the model favours an answer — not whether it is correct.',
      'Predictions far outside the range of the training data are extrapolations and are often unreliable.',
    ],
  },
];

export default function Learn() {
  return (
    <div className="stack-lg">
      <PageHeader title="Learn machine learning" lead="Short explanations and two demos you can run right now. Everything here is reproducible: same seed, same numbers." />

      <Card title="Start with a sample project">
        <ol className="plain-list">
          <li>
            Open the <Link to="/lab">Lab</Link> and press <strong>Run sample classification project</strong>.
          </li>
          <li>Watch the loss curve fall, then read the results and the plain-language explanation.</li>
          <li>Change the flower measurements in “Try a prediction” and see the probabilities move.</li>
          <li>
            Then try the <Link to="/datasets">Datasets page</Link>: pick “Two moons”, train logistic regression and a neural network, and compare.
          </li>
        </ol>
      </Card>

      <nav aria-label="Lessons" className="card">
        <h2 className="card-title">Contents</h2>
        <ul className="plain-list">
          {LESSONS.map((l) => (
            <li key={l.id}>
              <a href={`#/learn`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById(l.id)?.focus();
              }}>
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {LESSONS.map((l) => (
        <section key={l.id} id={l.id} tabIndex={-1} className="card" aria-labelledby={`${l.id}-h`}>
          <h2 id={`${l.id}-h`} className="card-title">
            {l.title}
          </h2>
          {l.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}

      <KnnDemo />
      <PolynomialDemo />
    </div>
  );
}
