import { useId, useRef } from 'react';
import { DataPreview } from '../components/DataPreview';
import { useLab } from '../components/LabContext';
import { Alert, Card, PageHeader, Spinner, downloadText } from '../components/ui';
import { getSampleDataset, sampleToCsv, SAMPLE_DATASET_LIST } from '../data/datasets';
import { CSV_LIMITS } from '../utils/csv';
import { sanitizeText } from '../utils/sanitize';
import { Link } from '../utils/router';

function SampleList() {
  const { loadSample, dataset } = useLab();
  return (
    <ul className="grid sample-grid">
      {SAMPLE_DATASET_LIST.map((s) => (
        <li key={s.id} className="card">
          <h3>{s.name}</h3>
          <p>
            <span className={`badge badge-${s.task}`}>{s.task}</span>
          </p>
          <p>{s.description}</p>
          <p className="muted">{s.hint}</p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => loadSample(s.id)} aria-pressed={dataset?.sampleId === s.id}>
              {dataset?.sampleId === s.id ? 'Selected' : 'Use this dataset'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => downloadText(`openml-lab-${s.id}.csv`, sampleToCsv(getSampleDataset(s.id)))}
              aria-label={`Download ${s.name} as CSV`}
            >
              Download CSV
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function UploadCard() {
  const { loadFile, loadStatus, dataset } = useLab();
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const maxMb = CSV_LIMITS.maxBytes / (1024 * 1024);

  return (
    <Card title="Upload your own CSV">
      <p id={helpId}>
        Choose a .csv, .tsv or .txt file with a header row. Limits: {maxMb} MB, {CSV_LIMITS.maxRows.toLocaleString()} rows,{' '}
        {CSV_LIMITS.maxColumns} columns. The file is read <strong>only in your browser</strong> and is never uploaded anywhere.
      </p>
      <div className="actions">
        <label className="btn btn-primary file-btn">
          Choose CSV file
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            aria-describedby={helpId}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
              e.target.value = ''; // allow re-selecting the same file
            }}
          />
        </label>
      </div>
      {loadStatus.loading && <Spinner label="Reading and validating file…" />}
      {loadStatus.error && (
        <Alert kind="error" title="This file could not be used">
          {loadStatus.error}
        </Alert>
      )}
      {dataset?.source === 'upload' && !loadStatus.error && !loadStatus.loading && (
        <Alert kind="success" title="File loaded">
          {dataset.name}: {dataset.table.rows.length} rows, {dataset.table.columns.length} columns.
        </Alert>
      )}
      <p className="muted">
        Tip: only numeric columns can be used as features. Text columns can be the target of a classification. Rows with a missing target
        are always removed.
      </p>
    </Card>
  );
}

function ConfigCard() {
  const { dataset, config, updateConfig, prepared } = useLab();
  const seedId = useId();
  if (!dataset) return null;
  const { columns } = dataset.table;
  const data = prepared.data;

  const toggleFeature = (name: string, on: boolean) =>
    updateConfig({ features: on ? [...config.features, name] : config.features.filter((f) => f !== name) });

  return (
    <Card title="Choose features and target">
      <div className="stack">
        <fieldset>
          <legend>Task</legend>
          <label className="inline">
            <input
              type="radio"
              name="task"
              checked={config.task === 'classification'}
              onChange={() => updateConfig({ task: 'classification' })}
            />{' '}
            Classification (predict a category)
          </label>
          <label className="inline">
            <input type="radio" name="task" checked={config.task === 'regression'} onChange={() => updateConfig({ task: 'regression' })} />{' '}
            Regression (predict a number)
          </label>
        </fieldset>

        <label>
          Target column (what to predict)
          <select
            value={config.target}
            onChange={(e) =>
              updateConfig({ target: e.target.value, features: config.features.filter((f) => f !== e.target.value) })
            }
          >
            {columns
              .filter((c) => c.type !== 'empty')
              .map((c) => (
                <option key={c.name} value={c.name}>
                  {sanitizeText(c.name, 40)} ({c.type})
                </option>
              ))}
          </select>
        </label>

        <fieldset>
          <legend>Feature columns (inputs)</legend>
          <div className="checks">
            {columns
              .filter((c) => c.name !== config.target)
              .map((c) => {
                const usable = c.type === 'numeric';
                return (
                  <label key={c.name} className={`inline ${usable ? '' : 'disabled'}`}>
                    <input
                      type="checkbox"
                      checked={config.features.includes(c.name)}
                      disabled={!usable}
                      onChange={(e) => toggleFeature(c.name, e.target.checked)}
                    />{' '}
                    {sanitizeText(c.name, 40)}
                    {!usable && <span className="muted"> — {c.type === 'empty' ? 'no values' : 'not numeric, unavailable'}</span>}
                    {usable && c.missing > 0 && <span className="muted"> — {c.missing} missing</span>}
                  </label>
                );
              })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Missing feature values</legend>
          <label className="inline">
            <input type="radio" name="missing" checked={config.missing === 'drop'} onChange={() => updateConfig({ missing: 'drop' })} /> Drop rows
            that have a missing feature
          </label>
          <label className="inline">
            <input
              type="radio"
              name="missing"
              checked={config.missing === 'impute-mean'}
              onChange={() => updateConfig({ missing: 'impute-mean' })}
            />{' '}
            Fill with the training-set average (computed after splitting, so no leakage)
          </label>
        </fieldset>

        <div className="param">
          <label htmlFor={seedId}>Random seed for the train / validation / test split</label>
          <input
            id={seedId}
            type="number"
            min={0}
            max={999999}
            step={1}
            value={config.seed}
            onChange={(e) => updateConfig({ seed: Math.max(0, Math.min(999999, Math.round(e.target.valueAsNumber) || 0)) })}
          />
          <small>The same seed always gives the same split, so results are reproducible.</small>
        </div>

        {prepared.error && (
          <Alert kind="error" title="Cannot prepare this data yet">
            {prepared.error}
          </Alert>
        )}
        {data && (
          <Alert kind="success" title="Data is ready">
            {data.train.y.length} training · {data.val.y.length} validation · {data.test.y.length} test rows
            {prepared.droppedRows > 0 && ` (${prepared.droppedRows} row(s) removed for missing values)`}.
            {config.task === 'classification' && ` ${data.classNames.length} classes: ${data.classNames.map((c) => sanitizeText(c, 20)).join(', ')}.`}
            {' '}
            <Link to="/train">Continue to training →</Link>
          </Alert>
        )}
      </div>
    </Card>
  );
}

export default function Datasets() {
  const { dataset } = useLab();
  return (
    <div className="stack-lg">
      <PageHeader
        title="Dataset laboratory"
        lead="Pick a built-in sample or upload your own CSV, check it, and choose what the model should learn from and predict."
      />
      <section aria-labelledby="samples-title" className="stack">
        <h2 id="samples-title">Sample datasets</h2>
        <p className="muted">
          All samples are synthetic: generated with a fixed random seed, so they are identical for everyone. They are for learning, not for
          drawing real-world conclusions.
        </p>
        <SampleList />
      </section>
      <UploadCard />
      {dataset && (
        <>
          {dataset.warnings.map((w) => (
            <Alert key={w} kind="warning">
              {w}
            </Alert>
          ))}
          <Card title={`Preview: ${dataset.name}`}>
            <DataPreview table={dataset.table} />
          </Card>
          <ConfigCard />
        </>
      )}
    </div>
  );
}
