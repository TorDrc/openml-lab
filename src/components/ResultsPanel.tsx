import { explainModel } from '../ml/explain';
import { isClassificationMetrics, type ClassificationMetrics, type Metrics, type SplitData, type TrainedModel } from '../ml/types';
import { sanitizeText } from '../utils/sanitize';
import { Alert, Card, fmt, pct } from './ui';
import { VisualPanel } from './Visuals';

const SPLIT_LABELS: [keyof TrainedModel['report'], string, string][] = [
  ['train', 'Training', 'Used to learn the model’s parameters.'],
  ['val', 'Validation', 'Used to check progress and compare settings.'],
  ['test', 'Test', 'Held back; scored once at the end.'],
];

function MetricsTable({ model }: { model: TrainedModel }) {
  const classification = model.task === 'classification';
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Evaluation metrics for the training, validation and test splits</caption>
        <thead>
          <tr>
            <th scope="col">Split</th>
            <th scope="col">Rows</th>
            {classification ? (
              <>
                <th scope="col">Accuracy</th>
                <th scope="col">Precision (macro)</th>
                <th scope="col">Recall (macro)</th>
                <th scope="col">F1 (macro)</th>
              </>
            ) : (
              <>
                <th scope="col">MAE</th>
                <th scope="col">RMSE</th>
                <th scope="col">R²</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {SPLIT_LABELS.map(([key, label, note]) => {
            const m: Metrics = model.report[key];
            return (
              <tr key={key}>
                <th scope="row">
                  {label}
                  <span className="cell-note">{note}</span>
                </th>
                <td>{m.n}</td>
                {isClassificationMetrics(m) ? (
                  <>
                    <td>{pct(m.accuracy)}</td>
                    <td>{pct(m.macroPrecision)}</td>
                    <td>{pct(m.macroRecall)}</td>
                    <td>{pct(m.macroF1)}</td>
                  </>
                ) : (
                  <>
                    <td>{fmt(m.mae)}</td>
                    <td>{fmt(m.rmse)}</td>
                    <td>{fmt(m.r2)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConfusionMatrix({ metrics, classNames }: { metrics: ClassificationMetrics; classNames: string[] }) {
  const max = Math.max(1, ...metrics.confusion.flat());
  return (
    <div className="table-wrap">
      <table className="confusion">
        <caption>Confusion matrix on the test set: rows are the true class, columns are what the model predicted.</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">True class \ predicted class</span>
            </th>
            {classNames.map((c) => (
              <th key={c} scope="col">
                {sanitizeText(c, 20)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.confusion.map((row, i) => (
            <tr key={classNames[i]}>
              <th scope="row">{sanitizeText(classNames[i], 20)}</th>
              {row.map((v, j) => (
                <td
                  key={classNames[j]}
                  className={i === j ? 'cm-diag' : ''}
                  style={{ ['--cm-strength' as string]: String(v / max) }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Full evaluation: metrics, plain-language explanation, confusion matrix and the visual. */
export function ResultsPanel({ model, data, baseline }: { model: TrainedModel; data: SplitData; baseline: number }) {
  const explanation = explainModel(model, model.task === 'classification' ? baseline : undefined);
  const test = model.report.test;
  return (
    <div className="stack">
      <Card title="Results">
        <p className="result-headline">{explanation.headline}</p>
        <MetricsTable model={model} />
        <p className="muted">
          Rows are split with seed {data.seed}: {data.train.y.length} training, {data.val.y.length} validation and {data.test.y.length} test.
          Scaling and missing-value filling were fitted on the training rows only, so no information leaks from validation or test data.
        </p>
      </Card>

      <Card title="What this means">
        <ul className="plain-list">
          {explanation.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {explanation.warnings.map((w) => (
          <Alert key={w} kind="warning">
            {w}
          </Alert>
        ))}
      </Card>

      <Card title={model.task === 'classification' ? 'Decision regions' : 'Fitted model'}>
        <VisualPanel model={model} data={data} />
      </Card>

      {isClassificationMetrics(test) && (
        <Card title="Where the mistakes are">
          <ConfusionMatrix metrics={test} classNames={model.classNames} />
        </Card>
      )}
    </div>
  );
}
