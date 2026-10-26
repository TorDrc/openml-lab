import { useId } from 'react';
import type { AlgorithmParams } from '../ml/types';

interface Spec {
  label: string;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
  help: string;
}

export const PARAM_SPECS: Record<keyof AlgorithmParams, Spec> = {
  learningRate: {
    label: 'Learning rate',
    min: 0.001,
    max: 0.5,
    step: 0.001,
    help: 'How big each learning step is. Too small is slow; too large makes the loss jump around.',
  },
  epochs: {
    label: 'Epochs',
    min: 1,
    max: 300,
    step: 1,
    integer: true,
    help: 'How many times the model sees the whole training set.',
  },
  batchSize: {
    label: 'Batch size',
    min: 4,
    max: 256,
    step: 1,
    integer: true,
    help: 'How many rows are used for each learning step.',
  },
  hiddenUnits: {
    label: 'Hidden units per layer',
    min: 2,
    max: 128,
    step: 1,
    integer: true,
    help: 'More units can learn more complex patterns but overfit more easily.',
  },
  hiddenLayers: {
    label: 'Hidden layers',
    min: 1,
    max: 3,
    step: 1,
    integer: true,
    help: 'Depth of the network. Start with 1.',
  },
  l2: {
    label: 'L2 regularisation',
    min: 0,
    max: 0.1,
    step: 0.001,
    help: 'Penalises large weights to reduce overfitting. 0 turns it off.',
  },
  k: {
    label: 'k (neighbours)',
    min: 1,
    max: 50,
    step: 1,
    integer: true,
    help: 'How many nearby rows vote. k = 1 memorises the data; large k gives smoother boundaries.',
  },
  lambda: {
    label: 'Lambda (shrinkage)',
    min: 0,
    max: 100,
    step: 0.1,
    help: 'Shrinks coefficients toward zero to reduce overfitting. 0 is ordinary least squares.',
  },
};

export function clampParam(key: keyof AlgorithmParams, value: number): number {
  const spec = PARAM_SPECS[key];
  if (!Number.isFinite(value)) return spec.min;
  const v = Math.min(spec.max, Math.max(spec.min, value));
  return spec.integer ? Math.round(v) : v;
}

interface Props {
  keys: (keyof AlgorithmParams)[];
  params: AlgorithmParams;
  disabled?: boolean;
  onChange: (next: AlgorithmParams) => void;
}

export function ParamControls({ keys, params, disabled, onChange }: Props) {
  const prefix = useId();
  return (
    <div className="param-grid">
      {keys.map((key) => {
        const spec = PARAM_SPECS[key];
        const id = `${prefix}-${key}`;
        return (
          <div key={key} className="param">
            <label htmlFor={id}>{spec.label}</label>
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={params[key]}
              disabled={disabled}
              aria-describedby={`${id}-help`}
              onChange={(e) => onChange({ ...params, [key]: clampParam(key, e.target.valueAsNumber) })}
            />
            <small id={`${id}-help`}>{spec.help}</small>
          </div>
        );
      })}
    </div>
  );
}
