import { useEffect, useMemo, useState } from 'react';
import { useLab } from '../components/LabContext';
import { ParamControls } from '../components/ParamControls';
import { PredictPanel } from '../components/PredictPanel';
import { ResultsPanel } from '../components/ResultsPanel';
import { TrainingStatus } from '../components/TrainingStatus';
import { Alert, Card, PageHeader } from '../components/ui';
import { algorithmsFor, defaultParamsFor, getAlgorithm } from '../ml/trainer';
import type { AlgorithmId } from '../ml/types';
import { Link } from '../utils/router';

export default function Train() {
  const { dataset, config, prepared, model, trainState, train, stop } = useLab();
  const options = useMemo(() => algorithmsFor(config.task), [config.task]);
  // Start from the existing model's settings (e.g. after a sample project) so the page reflects what was actually trained.
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>(model?.algorithm ?? options[0].id);
  const [params, setParams] = useState(() => model?.params ?? defaultParamsFor(model?.algorithm ?? options[0].id));

  // If the task changes in the dataset lab, fall back to the first matching algorithm.
  useEffect(() => {
    if (!options.some((o) => o.id === algorithmId)) {
      setAlgorithmId(options[0].id);
      setParams(defaultParamsFor(options[0].id));
    }
  }, [options, algorithmId]);

  const info = getAlgorithm(options.some((o) => o.id === algorithmId) ? algorithmId : options[0].id);
  const busy = trainState.status === 'loading' || trainState.status === 'training';
  const canTrain = Boolean(prepared.data) && !busy;

  const pick = (id: AlgorithmId) => {
    setAlgorithmId(id);
    setParams(defaultParamsFor(id));
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Training workspace"
        lead="Choose an algorithm, adjust its settings, then train. You can stop at any time and restart with different settings."
      />

      {!dataset && (
        <Alert kind="info" title="Choose a dataset first">
          Open the <Link to="/datasets">Datasets page</Link> to pick a sample or upload a CSV, or go to the <Link to="/lab">Lab</Link> and run a
          sample project.
        </Alert>
      )}
      {dataset && prepared.error && (
        <Alert kind="error" title="The selected data cannot be used yet">
          {prepared.error} <Link to="/datasets">Fix it in the dataset lab →</Link>
        </Alert>
      )}

      {dataset && (
        <p className="muted">
          Dataset: <strong>{dataset.name}</strong> · task: {config.task} · target: {config.target}
        </p>
      )}

      <Card title="1 · Algorithm">
        <div className="radio-cards" role="radiogroup" aria-label="Algorithm">
          {options.map((o) => (
            <label key={o.id} className={`radio-card ${o.id === info.id ? 'selected' : ''}`}>
              <input type="radio" name="algorithm" checked={o.id === info.id} disabled={busy} onChange={() => pick(o.id)} />
              <span className="radio-card-body">
                <strong>{o.name}</strong>
                <span className="muted">{o.uses}</span>
                <span>{o.summary}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card title="2 · Settings">
        <ParamControls keys={info.params} params={params} disabled={busy} onChange={setParams} />
        <div className="actions">
          <button type="button" className="btn" disabled={busy} onClick={() => setParams(defaultParamsFor(info.id))}>
            Reset settings
          </button>
        </div>
      </Card>

      <Card title="3 · Train">
        <div className="actions">
          <button type="button" className="btn btn-primary" disabled={!canTrain} onClick={() => void train(info.id, params)}>
            {model || trainState.status === 'error' ? 'Restart training' : 'Start training'}
          </button>
          <button type="button" className="btn btn-danger" disabled={!busy || !info.iterative} onClick={stop}>
            Stop
          </button>
        </div>
        {!info.iterative && <p className="muted">This algorithm has no training loop, so it finishes almost instantly and cannot be stopped midway.</p>}
        <TrainingStatus task={config.task} />
      </Card>

      {model && prepared.data && (
        <>
          <ResultsPanel model={model} data={prepared.data} baseline={prepared.baseline} />
          <PredictPanel model={model} />
        </>
      )}
    </div>
  );
}
