import { useLab } from '../components/LabContext';
import { PredictPanel } from '../components/PredictPanel';
import { TrainingStatus } from '../components/TrainingStatus';
import { Alert, Card, PageHeader, fmt, pct } from '../components/ui';
import { VisualPanel } from '../components/Visuals';
import { defaultParamsFor, getAlgorithm } from '../ml/trainer';
import { isClassificationMetrics } from '../ml/types';
import { Link } from '../utils/router';

export default function Lab() {
  const { dataset, config, prepared, model, trainState, runSample, stop } = useLab();
  const busy = trainState.status === 'loading' || trainState.status === 'training';
  const test = model?.report.test;

  return (
    <div className="stack-lg">
      <PageHeader
        title="Lab dashboard"
        lead="Run a ready-made project in one click, then try predictions and see what the model learned."
      />

      <Card title="Sample projects">
        <p>
          Each project loads a built-in synthetic dataset, splits it into training / validation / test sets, trains a model in your browser and
          shows honest results. The first TensorFlow.js run downloads the library once (several MB).
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void runSample('flowers', 'logistic', defaultParamsFor('logistic'))}
          >
            Run sample classification project
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void runSample('houses', 'linear-sgd', defaultParamsFor('linear-sgd'))}
          >
            Run sample regression project
          </button>
          {busy && (
            <button type="button" className="btn btn-danger" onClick={stop}>
              Stop training
            </button>
          )}
        </div>
        <ul className="plain-list muted">
          <li>Classification: synthetic flowers (4 measurements, 3 species) with logistic regression.</li>
          <li>Regression: synthetic house prices (4 features) with gradient-descent linear regression.</li>
        </ul>
      </Card>

      <div className="grid two">
        <Card title="Current dataset">
          {dataset ? (
            <dl className="facts">
              <dt>Name</dt>
              <dd>{dataset.name}</dd>
              <dt>Rows</dt>
              <dd>{dataset.table.rows.length}</dd>
              <dt>Task</dt>
              <dd>{config.task}</dd>
              <dt>Target</dt>
              <dd>{config.target || '–'}</dd>
              <dt>Features</dt>
              <dd>{config.features.join(', ') || '–'}</dd>
            </dl>
          ) : (
            <p className="muted">No dataset loaded yet. Run a sample project or open the Datasets page.</p>
          )}
          {prepared.error && <Alert kind="error">{prepared.error}</Alert>}
          <p>
            <Link to="/datasets">Explore or change the dataset →</Link>
          </p>
        </Card>

        <Card title="Current model">
          {model && test ? (
            <dl className="facts">
              <dt>Algorithm</dt>
              <dd>{getAlgorithm(model.algorithm).name}</dd>
              <dt>{isClassificationMetrics(test) ? 'Test accuracy' : 'Test RMSE'}</dt>
              <dd>
                {isClassificationMetrics(test) ? pct(test.accuracy) : fmt(test.rmse)} <span className="muted">(on {test.n} unseen rows)</span>
              </dd>
              {!isClassificationMetrics(test) && (
                <>
                  <dt>Test R²</dt>
                  <dd>{fmt(test.r2)}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="muted">No trained model yet.</p>
          )}
          <p>
            <Link to="/train">{model ? 'See full results and train again →' : 'Open the training workspace →'}</Link>
          </p>
        </Card>
      </div>

      {trainState.status !== 'idle' && (
        <Card title="Training progress">
          <TrainingStatus task={config.task} />
        </Card>
      )}

      {model && prepared.data && (
        <>
          <PredictPanel model={model} />
          <Card title={model.task === 'classification' ? 'Decision regions' : 'Fitted model'}>
            <VisualPanel model={model} data={prepared.data} />
          </Card>
        </>
      )}
    </div>
  );
}
