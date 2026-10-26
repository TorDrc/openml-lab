import { getAlgorithm } from '../ml/trainer';
import type { Task } from '../ml/types';
import { useLab } from './LabContext';
import { LossChart } from './LossChart';
import { Alert, Spinner } from './ui';

/** Live status, progress bar and loss chart for the current (or last) training run. */
export function TrainingStatus({ task }: { task: Task }) {
  const { trainState, model } = useLab();
  const { status, epoch, total, history, error, algorithm } = trainState;
  const info = algorithm ? getAlgorithm(algorithm) : null;

  if (status === 'idle') return <p className="muted">No training run yet. Choose an algorithm and press Start training.</p>;

  return (
    <div className="stack" aria-live="polite">
      {status === 'loading' && (
        <Spinner label={info?.uses === 'TensorFlow.js' ? 'Loading TensorFlow.js (first time only)…' : 'Training…'} />
      )}
      {status === 'training' && (
        <div>
          <label htmlFor="train-progress" className="progress-label">
            Training {info?.name}: epoch {epoch} of {total}
          </label>
          <progress id="train-progress" value={epoch} max={Math.max(total, 1)} />
        </div>
      )}
      {status === 'done' && (
        <Alert kind="success" title={model?.stoppedEarly ? 'Training stopped early' : 'Training complete'}>
          {info?.iterative
            ? `${history.length} epoch(s) completed.`
            : `${info?.name} has no training loop: it was fitted in a single step, so there is no loss curve.`}
        </Alert>
      )}
      {status === 'error' && (
        <Alert kind="error" title="Training failed">
          {error ?? 'Something went wrong.'} Try different settings, or check that your browser supports WebGL or WebAssembly.
        </Alert>
      )}
      {info?.iterative && status !== 'loading' && status !== 'error' && <LossChart history={history} totalEpochs={total} task={task} />}
    </div>
  );
}
