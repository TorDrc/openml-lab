import type { EpochLog, Task } from '../ml/types';
import { fmt } from './ui';

interface Props {
  history: EpochLog[];
  totalEpochs: number;
  task: Task;
}

const W = 520;
const H = 240;
const M = { top: 12, right: 12, bottom: 30, left: 46 };

function path(values: number[], x: (i: number) => number, y: (v: number) => number): string {
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
}

/** Training / validation curves drawn as plain SVG (no charting library, so the page stays small). */
export function LossChart({ history, totalEpochs, task }: Props) {
  const scoreName = task === 'classification' ? 'accuracy' : 'R²';
  if (history.length === 0) {
    return <p className="muted">The loss curve appears here as soon as the first epoch finishes.</p>;
  }
  const train = history.map((h) => h.trainLoss).filter(Number.isFinite);
  const val = history.map((h) => h.valLoss).filter(Number.isFinite);
  const all = [...train, ...val];
  const maxLoss = Math.max(...all, 1e-9);
  const minLoss = Math.min(...all, 0);
  const span = maxLoss - minLoss || 1;
  const n = Math.max(totalEpochs, history.length, 2);
  const px = (i: number) => M.left + (i / (n - 1)) * (W - M.left - M.right);
  const py = (v: number) => M.top + (1 - (v - minLoss) / span) * (H - M.top - M.bottom);
  const last = history[history.length - 1];
  const ticks = [0, 0.5, 1].map((t) => minLoss + t * span);

  const summary = `Loss over ${history.length} of ${totalEpochs} epochs. Latest training loss ${fmt(last.trainLoss)}, validation loss ${fmt(last.valLoss)}, training ${scoreName} ${fmt(last.trainScore)}, validation ${scoreName} ${fmt(last.valScore)}.`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="chart-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={py(t)} y2={py(t)} className="gridline" />
            <text x={M.left - 6} y={py(t) + 4} textAnchor="end" className="axis-text">
              {fmt(t, 2)}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - 8} className="axis-text">
          epoch 1
        </text>
        <text x={W - M.right} y={H - 8} textAnchor="end" className="axis-text">
          epoch {n}
        </text>
        <path d={path(train, (i) => px(i), py)} className="line line-train" fill="none" />
        <path d={path(val, (i) => px(i), py)} className="line line-val" fill="none" />
      </svg>
      <figcaption className="legend">
        <span className="key key-train">Training loss</span>
        <span className="key key-val">Validation loss</span>
        <span className="muted">
          Latest {scoreName}: training {fmt(last.trainScore)}, validation {fmt(last.valScore)}
        </span>
      </figcaption>
    </figure>
  );
}
