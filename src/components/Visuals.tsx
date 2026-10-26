import { useEffect, useMemo, useRef, useState } from 'react';
import { boundaryGrid, regressionCurve } from '../ml/predict';
import type { SplitData, TrainedModel } from '../ml/types';
import { useThemeVersion } from '../utils/theme';
import { classColor, fmt } from './ui';

const RESOLUTION = 60;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Original-unit coordinates of rows for one feature. */
function rawColumn(data: SplitData, rows: number[][], feature: number): number[] {
  const { means, stds } = data.preprocessor;
  return rows.map((r) => r[feature] * stds[feature] + means[feature]);
}

interface BoundaryProps {
  model: TrainedModel;
  data: SplitData;
  featureX: number;
  featureY: number;
}

/** Decision regions on a canvas, with training and test rows drawn on top. */
export function BoundaryPlot({ model, data, featureX, featureY }: BoundaryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeVersion = useThemeVersion();
  const grid = useMemo(() => boundaryGrid(model, featureX, featureY, RESOLUTION), [model, featureX, featureY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const style = getComputedStyle(document.documentElement);
    const colours = Array.from({ length: Math.max(model.classNames.length, 1) }, (_, i) => hexToRgb(style.getPropertyValue(`--c${i % 8}`)));
    const image = ctx.createImageData(grid.width, grid.height);
    for (let i = 0; i < grid.classes.length; i++) {
      const [r, g, b] = colours[grid.classes[i]] ?? [128, 128, 128];
      image.data[i * 4] = r;
      image.data[i * 4 + 1] = g;
      image.data[i * 4 + 2] = b;
      image.data[i * 4 + 3] = Math.round(255 * (0.22 + 0.45 * grid.confidence[i]));
    }
    ctx.putImageData(image, 0, 0);
  }, [grid, model.classNames.length, themeVersion]);

  const sx = (v: number) => ((v - grid.xMin) / (grid.xMax - grid.xMin)) * 100;
  const sy = (v: number) => (1 - (v - grid.yMin) / (grid.yMax - grid.yMin)) * 100;

  const points = (rows: number[][], labels: number[], kind: 'train' | 'test') => {
    const xs = rawColumn(data, rows, featureX);
    const ys = rawColumn(data, rows, featureY);
    return xs.map((x, i) => (
      <circle
        key={`${kind}-${i}`}
        cx={sx(x)}
        cy={sy(ys[i])}
        r={kind === 'test' ? 1.7 : 1.1}
        fill={classColor(labels[i])}
        className={kind === 'test' ? 'pt pt-test' : 'pt pt-train'}
      />
    ));
  };

  return (
    <figure className="plot">
      <div className="plot-box">
        <canvas
          ref={canvasRef}
          width={grid.width}
          height={grid.height}
          className="plot-canvas"
          role="img"
          aria-label={`Predicted class regions over ${data.featureNames[featureX]} and ${data.featureNames[featureY]}`}
        />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="plot-overlay" aria-hidden="true">
          {points(data.train.X, data.train.y, 'train')}
          {points(data.test.X, data.test.y, 'test')}
        </svg>
      </div>
      <figcaption className="plot-caption">
        <span>
          x: <strong>{data.featureNames[featureX]}</strong> ({fmt(grid.xMin)} to {fmt(grid.xMax)}) · y: <strong>{data.featureNames[featureY]}</strong> ({fmt(grid.yMin)} to {fmt(grid.yMax)})
        </span>
        <span className="legend">
          {model.classNames.map((c, i) => (
            <span key={c} className="key" style={{ ['--key-color' as string]: classColor(i) }}>
              {c}
            </span>
          ))}
        </span>
        <span className="muted">Small dots are training rows; larger outlined dots are test rows the model never saw. Shading is the model&apos;s predicted class; stronger shading means higher confidence.</span>
      </figcaption>
    </figure>
  );
}

interface RegressionProps {
  model: TrainedModel;
  data: SplitData;
  feature: number;
}

const RW = 520;
const RH = 280;
const RM = { top: 12, right: 14, bottom: 34, left: 54 };

/** Fitted curve (other features held at their average) over training and test points. */
export function RegressionPlot({ model, data, feature }: RegressionProps) {
  const curve = useMemo(() => regressionCurve(model, feature, 80), [model, feature]);
  const { mean, std } = data.targetScaler;
  const trainX = rawColumn(data, data.train.X, feature);
  const testX = rawColumn(data, data.test.X, feature);
  const trainY = data.train.y.map((v) => v * std + mean);
  const testY = data.test.y.map((v) => v * std + mean);

  const xs = [...trainX, ...testX, ...curve.x];
  const ys = [...trainY, ...testY, ...curve.y];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const px = (v: number) => RM.left + ((v - xMin) / (xMax - xMin || 1)) * (RW - RM.left - RM.right);
  const py = (v: number) => RM.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (RH - RM.top - RM.bottom);
  const line = curve.x.map((x, i) => `${i === 0 ? 'M' : 'L'}${px(x).toFixed(1)},${py(curve.y[i]).toFixed(1)}`).join(' ');

  return (
    <figure className="plot">
      <svg
        viewBox={`0 0 ${RW} ${RH}`}
        className="chart-svg"
        role="img"
        aria-label={`Scatter plot of ${data.targetName} against ${data.featureNames[feature]} with the model's fitted curve`}
      >
        {[yMin, (yMin + yMax) / 2, yMax].map((t) => (
          <g key={t}>
            <line x1={RM.left} x2={RW - RM.right} y1={py(t)} y2={py(t)} className="gridline" />
            <text x={RM.left - 6} y={py(t) + 4} textAnchor="end" className="axis-text">
              {fmt(t, 3)}
            </text>
          </g>
        ))}
        <text x={RM.left} y={RH - 10} className="axis-text">
          {fmt(xMin)}
        </text>
        <text x={RW - RM.right} y={RH - 10} textAnchor="end" className="axis-text">
          {fmt(xMax)}
        </text>
        <text x={(RM.left + RW - RM.right) / 2} y={RH - 10} textAnchor="middle" className="axis-text">
          {data.featureNames[feature]}
        </text>
        {trainX.map((x, i) => (
          <circle key={`a${i}`} cx={px(x)} cy={py(trainY[i])} r={2.4} className="pt-reg-train" />
        ))}
        {testX.map((x, i) => (
          <circle key={`b${i}`} cx={px(x)} cy={py(testY[i])} r={3.4} className="pt-reg-test" />
        ))}
        <path d={line} fill="none" className="line line-fit" />
      </svg>
      <figcaption className="plot-caption">
        <span className="legend">
          <span className="key key-train">Training rows</span>
          <span className="key key-test">Test rows (unseen)</span>
          <span className="key key-fit">Model prediction</span>
        </span>
        <span className="muted">
          y-axis: <strong>{data.targetName}</strong>.{' '}
          {data.featureNames.length > 1
            ? 'The model line holds all other features at their average, so points can sit away from it because they differ in those other features.'
            : 'The line is the model prediction across the feature range.'}
        </span>
      </figcaption>
    </figure>
  );
}

/** Picks the right visual for the task and lets users choose which features to plot. */
export function VisualPanel({ model, data }: { model: TrainedModel; data: SplitData }) {
  const nf = data.featureNames.length;
  const [fx, setFx] = useState(0);
  const [fy, setFy] = useState(Math.min(1, nf - 1));
  const safeFx = Math.min(fx, nf - 1);
  const safeFy = Math.min(fy, nf - 1);

  if (model.task === 'classification') {
    if (nf < 2) return <p className="muted">A decision-boundary plot needs at least two features.</p>;
    const yIndex = safeFy === safeFx ? (safeFx + 1) % nf : safeFy;
    return (
      <div>
        {nf > 2 && (
          <div className="row">
            <label>
              Horizontal feature
              <select value={safeFx} onChange={(e) => setFx(Number(e.target.value))}>
                {data.featureNames.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vertical feature
              <select value={yIndex} onChange={(e) => setFy(Number(e.target.value))}>
                {data.featureNames.map((n, i) => (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {nf > 2 && <p className="muted">With more than two features this is a 2-D slice: the other features are held at their training average.</p>}
        <BoundaryPlot model={model} data={data} featureX={safeFx} featureY={yIndex} />
      </div>
    );
  }

  return (
    <div>
      {nf > 1 && (
        <div className="row">
          <label>
            Feature to plot
            <select value={safeFx} onChange={(e) => setFx(Number(e.target.value))}>
              {data.featureNames.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <RegressionPlot model={model} data={data} feature={safeFx} />
    </div>
  );
}
