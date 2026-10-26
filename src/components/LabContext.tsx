import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSampleDataset, sampleToTable } from '../data/datasets';
import { DataError, selectData, suggestConfig } from '../ml/prepare';
import { buildSplitData } from '../ml/split';
import { majorityBaseline, trainModel } from '../ml/trainer';
import type { AlgorithmId, AlgorithmParams, EpochLog, MissingStrategy, SplitData, Task, TrainedModel } from '../ml/types';
import { describeLoadError, parseCsvFile, type Table } from '../utils/csv';
import { sanitizeText } from '../utils/sanitize';

export interface DatasetState {
  name: string;
  source: 'sample' | 'upload';
  sampleId?: string;
  table: Table;
  warnings: string[];
}

export interface LabConfig {
  task: Task;
  features: string[];
  target: string;
  missing: MissingStrategy;
  seed: number;
}

export type TrainStatus = 'idle' | 'loading' | 'training' | 'done' | 'error';

export interface TrainState {
  status: TrainStatus;
  algorithm?: AlgorithmId;
  epoch: number;
  total: number;
  history: EpochLog[];
  error?: string;
}

export interface Prepared {
  data: SplitData | null;
  droppedRows: number;
  error: string | null;
  baseline: number;
}

interface LabContextValue {
  dataset: DatasetState | null;
  loadSample: (id: string) => void;
  loadFile: (file: File) => Promise<void>;
  loadStatus: { loading: boolean; error: string | null };
  config: LabConfig;
  updateConfig: (patch: Partial<LabConfig>) => void;
  prepared: Prepared;
  model: TrainedModel | null;
  trainState: TrainState;
  train: (algorithm: AlgorithmId, params: AlgorithmParams) => Promise<void>;
  /** Load a built-in sample dataset and immediately train on it (the "run the sample project" path). */
  runSample: (sampleId: string, algorithm: AlgorithmId, params: AlgorithmParams) => Promise<void>;
  stop: () => void;
  discardModel: () => void;
}

const EMPTY_CONFIG: LabConfig = { task: 'classification', features: [], target: '', missing: 'drop', seed: 42 };
const IDLE: TrainState = { status: 'idle', epoch: 0, total: 0, history: [] };

const LabContext = createContext<LabContextValue | null>(null);

export function useLab(): LabContextValue {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab must be used inside <LabProvider>.');
  return ctx;
}

export function LabProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [config, setConfig] = useState<LabConfig>(EMPTY_CONFIG);
  const [model, setModel] = useState<TrainedModel | null>(null);
  const [trainState, setTrainState] = useState<TrainState>(IDLE);
  const [loadStatus, setLoadStatus] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<EpochLog[]>([]);
  const modelRef = useRef<TrainedModel | null>(null);

  const discardModel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    modelRef.current?.predictor.dispose();
    modelRef.current = null;
    historyRef.current = [];
    setModel(null);
    setTrainState(IDLE);
  }, []);

  const loadSample = useCallback(
    (id: string) => {
      const ds = getSampleDataset(id);
      discardModel();
      setDataset({ name: ds.name, source: 'sample', sampleId: id, table: sampleToTable(ds), warnings: [] });
      setConfig({ task: ds.task, features: ds.featureNames, target: ds.targetName, missing: 'drop', seed: 42 });
      setLoadStatus({ loading: false, error: null });
    },
    [discardModel],
  );

  const loadFile = useCallback(
    async (file: File) => {
      setLoadStatus({ loading: true, error: null });
      try {
        const { table, warnings } = await parseCsvFile(file);
        discardModel();
        const suggestion = suggestConfig(table);
        setDataset({ name: sanitizeText(file.name, 60), source: 'upload', table, warnings });
        setConfig({
          task: suggestion.task,
          features: suggestion.features,
          target: suggestion.target,
          missing: 'drop',
          seed: 42,
        });
        setLoadStatus({ loading: false, error: null });
      } catch (error) {
        // Keep whatever dataset was loaded before; only report the problem.
        setLoadStatus({ loading: false, error: describeLoadError(error) });
      }
    },
    [discardModel],
  );

  const updateConfig = useCallback(
    (patch: Partial<LabConfig>) => {
      discardModel();
      setConfig((c) => ({ ...c, ...patch }));
    },
    [discardModel],
  );

  const prepared = useMemo<Prepared>(() => {
    if (!dataset) return { data: null, droppedRows: 0, error: null, baseline: 0 };
    try {
      const raw = selectData(dataset.table, config.features, config.target, config.task, config.missing);
      const data = buildSplitData(raw, config.seed);
      return { data, droppedRows: raw.droppedRows, error: null, baseline: majorityBaseline(data) };
    } catch (error) {
      const message = error instanceof DataError ? error.message : 'The selected data could not be prepared.';
      return { data: null, droppedRows: 0, error: message, baseline: 0 };
    }
  }, [dataset, config]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const startTraining = useCallback(async (data: SplitData, algorithm: AlgorithmId, params: AlgorithmParams) => {
    // Restart semantics: stop any running job and drop the previous model.
    abortRef.current?.abort();
    modelRef.current?.predictor.dispose();
    modelRef.current = null;
    setModel(null);
    historyRef.current = [];

    const controller = new AbortController();
    abortRef.current = controller;
    setTrainState({ status: 'loading', algorithm, epoch: 0, total: params.epochs, history: [] });

    try {
      const trained = await trainModel({
        algorithm,
        params,
        data,
        signal: controller.signal,
        onEpoch: (log, total) => {
          if (abortRef.current !== controller) return; // superseded by a newer run or a dataset change
          historyRef.current.push(log);
          setTrainState({ status: 'training', algorithm, epoch: log.epoch, total, history: historyRef.current.slice() });
        },
      });
      if (abortRef.current !== controller) {
        trained.predictor.dispose(); // a newer run or a dataset change replaced this one
        return;
      }
      modelRef.current = trained;
      setModel(trained);
      setTrainState({ status: 'done', algorithm, epoch: trained.history.length, total: params.epochs, history: trained.history });
    } catch (error) {
      if (abortRef.current !== controller) return;
      const message = error instanceof Error ? sanitizeText(error.message, 200) : 'Training failed.';
      setTrainState({ status: 'error', algorithm, epoch: 0, total: params.epochs, history: [], error: message });
    }
  }, []);

  const train = useCallback(
    async (algorithm: AlgorithmId, params: AlgorithmParams) => {
      if (prepared.data) await startTraining(prepared.data, algorithm, params);
    },
    [prepared.data, startTraining],
  );

  const runSample = useCallback(
    async (sampleId: string, algorithm: AlgorithmId, params: AlgorithmParams) => {
      const ds = getSampleDataset(sampleId);
      const table = sampleToTable(ds);
      const nextConfig: LabConfig = { task: ds.task, features: ds.featureNames, target: ds.targetName, missing: 'drop', seed: 42 };
      discardModel();
      setDataset({ name: ds.name, source: 'sample', sampleId, table, warnings: [] });
      setConfig(nextConfig);
      setLoadStatus({ loading: false, error: null });
      const raw = selectData(table, nextConfig.features, nextConfig.target, nextConfig.task, nextConfig.missing);
      await startTraining(buildSplitData(raw, nextConfig.seed), algorithm, params);
    },
    [discardModel, startTraining],
  );

  const value = useMemo<LabContextValue>(
    () => ({ dataset, loadSample, loadFile, loadStatus, config, updateConfig, prepared, model, trainState, train, runSample, stop, discardModel }),
    [dataset, loadSample, loadFile, loadStatus, config, updateConfig, prepared, model, trainState, train, runSample, stop, discardModel],
  );

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}
