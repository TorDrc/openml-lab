import { parseCsv, tableToCsv, type Table } from '../utils/csv';
import { createRng, type Rng } from '../utils/rng';
import type { Task } from '../ml/types';

/**
 * Built-in sample datasets. All of them are SYNTHETIC: generated on the fly by a
 * seeded random number generator, so they are identical on every machine and
 * add nothing to the download size. They are teaching tools, not real-world data.
 */
export interface SampleDataset {
  id: string;
  name: string;
  task: Task;
  description: string;
  featureNames: string[];
  targetName: string;
  /** What to try with this dataset. */
  hint: string;
  headers: string[];
  rows: (string | number)[][];
}

type Cell = string | number;

const round = (v: number, digits = 3): number => Number(v.toFixed(digits));

interface DatasetDef {
  id: string;
  name: string;
  task: Task;
  description: string;
  hint: string;
  featureNames: string[];
  targetName: string;
  seed: number;
  generate: (rng: Rng) => Cell[][];
}

function threeBlobs(rng: Rng): Cell[][] {
  const centers: [number, number, string][] = [
    [-2, -1.5, 'class_a'],
    [2, -1, 'class_b'],
    [0, 2.5, 'class_c'],
  ];
  const rows: Cell[][] = [];
  for (const [cx, cy, label] of centers) {
    for (let i = 0; i < 50; i++) rows.push([round(cx + rng.normal()), round(cy + rng.normal()), label]);
  }
  return rows;
}

function twoMoons(rng: Rng): Cell[][] {
  const rows: Cell[][] = [];
  for (let i = 0; i < 100; i++) {
    const t = Math.PI * (i / 99);
    rows.push([round(Math.cos(t) + 0.2 * rng.normal()), round(Math.sin(t) + 0.2 * rng.normal()), 'moon_a']);
    rows.push([round(1 - Math.cos(t) + 0.2 * rng.normal()), round(0.5 - Math.sin(t) + 0.2 * rng.normal()), 'moon_b']);
  }
  return rows;
}

function syntheticFlowers(rng: Rng): Cell[][] {
  // [petal_length, petal_width, sepal_length, sepal_width] means per made-up species.
  const species: [number[], string][] = [
    [[1.5, 0.3, 5.0, 3.4], 'species_a'],
    [[4.3, 1.3, 5.9, 2.8], 'species_b'],
    [[5.6, 2.0, 6.6, 3.0], 'species_c'],
  ];
  const sd = [0.35, 0.2, 0.45, 0.3];
  const rows: Cell[][] = [];
  for (const [means, label] of species) {
    for (let i = 0; i < 50; i++) {
      rows.push([...means.map((m, j) => round(Math.max(0.1, m + sd[j] * rng.normal()), 2)), label]);
    }
  }
  return rows;
}

function housePrices(rng: Rng): Cell[][] {
  const rows: Cell[][] = [];
  for (let i = 0; i < 240; i++) {
    const size = 30 + rng.next() * 220;
    const bedrooms = Math.max(1, Math.min(6, Math.round(size / 45 + rng.normal() * 0.7)));
    const age = Math.floor(rng.next() * 60);
    const distance = 0.5 + rng.next() * 29.5;
    const price = 60 + 1.2 * size + 8 * bedrooms - 1.1 * age - 3.5 * distance + 15 * rng.normal();
    rows.push([round(size, 1), bedrooms, age, round(distance, 1), round(price, 1)]);
  }
  return rows;
}

function housePricesMissing(rng: Rng): Cell[][] {
  const rows = housePrices(rng);
  // Deterministically blank ~6% of `age_years` and ~4% of `distance_km` cells.
  const blank = createRng(7);
  for (const row of rows) {
    if (blank.next() < 0.06) row[2] = '';
    if (blank.next() < 0.04) row[3] = '';
  }
  return rows;
}

function quadraticCurve(rng: Rng): Cell[][] {
  const rows: Cell[][] = [];
  for (let i = 0; i < 160; i++) {
    const x = -3 + rng.next() * 6;
    rows.push([round(x), round(0.5 * x * x - x + 2 + 0.4 * rng.normal())]);
  }
  return rows;
}

const DEFS: DatasetDef[] = [
  {
    id: 'flowers',
    name: 'Synthetic flowers (3 species)',
    task: 'classification',
    description: '150 made-up flowers with 4 measurements and 3 species. Easy, nearly separable classes.',
    hint: 'Start here: train logistic regression, then try entering your own measurements.',
    featureNames: ['petal_length', 'petal_width', 'sepal_length', 'sepal_width'],
    targetName: 'species',
    seed: 11,
    generate: syntheticFlowers,
  },
  {
    id: 'blobs',
    name: 'Three blobs (2D)',
    task: 'classification',
    description: '150 points in three overlapping clusters. Two features, so the decision boundary can be drawn.',
    hint: 'Compare k-NN with k = 1 and k = 25 and watch the boundary change.',
    featureNames: ['x1', 'x2'],
    targetName: 'label',
    seed: 21,
    generate: threeBlobs,
  },
  {
    id: 'moons',
    name: 'Two moons (2D)',
    task: 'classification',
    description: '200 points in two interleaved crescents. A straight line cannot separate them.',
    hint: 'Logistic regression underfits here; a neural network or k-NN can bend the boundary.',
    featureNames: ['x1', 'x2'],
    targetName: 'label',
    seed: 31,
    generate: twoMoons,
  },
  {
    id: 'houses',
    name: 'House prices (synthetic)',
    task: 'regression',
    description: '240 made-up houses: size, bedrooms, age and distance to the centre determine the price (thousands).',
    hint: 'Ridge regression should do very well because the data really is linear plus noise.',
    featureNames: ['size_m2', 'bedrooms', 'age_years', 'distance_km'],
    targetName: 'price_k',
    seed: 41,
    generate: housePrices,
  },
  {
    id: 'houses-missing',
    name: 'House prices with missing values',
    task: 'regression',
    description: 'The same house data with some age and distance values blanked out, to practise handling missing values.',
    hint: 'Compare "drop rows" with "fill with training mean" in the dataset lab.',
    featureNames: ['size_m2', 'bedrooms', 'age_years', 'distance_km'],
    targetName: 'price_k',
    seed: 41,
    generate: housePricesMissing,
  },
  {
    id: 'curve',
    name: 'Noisy curve (1 feature)',
    task: 'regression',
    description: '160 points along a parabola with noise. One feature, so the fitted curve can be drawn.',
    hint: 'A straight-line model underfits; a small neural network can follow the curve.',
    featureNames: ['x'],
    targetName: 'y',
    seed: 51,
    generate: quadraticCurve,
  },
];

const HEADERS = (def: DatasetDef): string[] => [...def.featureNames, def.targetName];

export const SAMPLE_DATASET_LIST: { id: string; name: string; task: Task; description: string; hint: string }[] =
  DEFS.map(({ id, name, task, description, hint }) => ({ id, name, task, description, hint }));

export const DEFAULT_SAMPLE_ID = 'flowers';

/** Generate a sample dataset. Deterministic: the same id always yields identical rows. */
export function getSampleDataset(id: string): SampleDataset {
  const def = DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown sample dataset: ${id}`);
  return {
    id: def.id,
    name: def.name,
    task: def.task,
    description: def.description,
    hint: def.hint,
    featureNames: def.featureNames,
    targetName: def.targetName,
    headers: HEADERS(def),
    rows: def.generate(createRng(def.seed)),
  };
}

export function sampleToCsv(ds: SampleDataset): string {
  return tableToCsv(
    ds.headers,
    ds.rows.map((r) => r.map((v) => (v === '' ? null : v))),
  );
}

/** Build a typed Table for a sample using the same CSV path as user uploads. */
export function sampleToTable(ds: SampleDataset): Table {
  return parseCsv(sampleToCsv(ds)).table;
}
