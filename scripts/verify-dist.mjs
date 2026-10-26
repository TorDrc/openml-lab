#!/usr/bin/env node
// Verifies a production build (dist/) before it is published to GitHub Pages.
//
// The classic Pages failure is a project site served from /<repo>/ whose HTML still
// points at /assets/... (the site root), which 404s. This script checks that every
// local reference in index.html carries the expected base path and resolves to a
// real file in dist/.
//
// Usage:  node scripts/verify-dist.mjs [distDir] [base]
//         base defaults to $VITE_BASE, then "/".
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ATTR = /\b(?:src|href)\s*=\s*("([^"]*)"|'([^']*)')/gi;

/** @param {string} base */
function normaliseBase(base) {
  let b = base.startsWith('/') ? base : `/${base}`;
  if (!b.endsWith('/')) b += '/';
  return b;
}

/**
 * @param {string} distDir
 * @param {string} baseInput
 * @returns {{ errors: string[], warnings: string[], checked: string[] }}
 */
export function verifyDist(distDir, baseInput = '/') {
  const base = normaliseBase(baseInput);
  const errors = [];
  const warnings = [];
  const checked = [];
  const indexPath = join(distDir, 'index.html');

  if (!existsSync(indexPath)) {
    return { errors: [`${indexPath} does not exist. Run "npm run build" first.`], warnings, checked };
  }
  const html = readFileSync(indexPath, 'utf8');

  if (html.includes('%BASE_URL%')) errors.push('index.html still contains an unreplaced %BASE_URL% placeholder.');
  if (html.includes('<!--CSP-->')) errors.push('The <!--CSP--> placeholder was not replaced; the Content-Security-Policy meta tag is missing.');
  else if (!/http-equiv=["']Content-Security-Policy["']/i.test(html)) errors.push('No Content-Security-Policy <meta> tag found in index.html.');

  for (const match of html.matchAll(ATTR)) {
    const ref = match[2] ?? match[3] ?? '';
    if (ref === '' || ref.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue; // external, data:, mailto:, #anchor
    checked.push(ref);

    if (!ref.startsWith(base)) {
      errors.push(
        ref.startsWith('/')
          ? `"${ref}" is root-absolute but the site is served from "${base}" (it would 404 on GitHub Pages).`
          : `"${ref}" is a relative path; expected it to start with "${base}".`,
      );
      continue;
    }
    const file = resolve(distDir, ref.slice(base.length).split(/[?#]/)[0]);
    if (!file.startsWith(resolve(distDir))) {
      errors.push(`"${ref}" resolves outside dist/.`);
    } else if (!existsSync(file) || !statSync(file).isFile()) {
      errors.push(`"${ref}" is referenced by index.html but ${file} does not exist.`);
    }
  }

  const assetsDir = join(distDir, 'assets');
  const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
  if (!assets.some((f) => f.endsWith('.js'))) errors.push('dist/assets contains no JavaScript bundle.');
  if (!assets.some((f) => f.endsWith('.css'))) warnings.push('dist/assets contains no CSS file.');

  // Performance guard: TensorFlow.js must stay a lazy chunk, never part of the first page load.
  for (const ref of checked) {
    if (/tfjs/i.test(ref)) errors.push(`index.html loads the TensorFlow.js chunk "${ref}" eagerly; it must be dynamically imported.`);
  }
  if (!assets.some((f) => /^tfjs/i.test(f))) warnings.push('No separate tfjs chunk found in dist/assets (is TensorFlow.js bundled elsewhere?).');

  return { errors, warnings, checked };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const distDir = resolve(process.argv[2] ?? 'dist');
  const base = process.argv[3] ?? process.env.VITE_BASE ?? '/';
  const { errors, warnings, checked } = verifyDist(distDir, base);
  console.log(`Checked ${checked.length} local reference(s) in ${distDir} against base "${normaliseBase(base)}".`);
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`error: ${e}`);
    process.exit(1);
  }
  console.log('dist/ looks correct for the configured base path.');
}
