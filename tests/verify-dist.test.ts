import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyDist } from '../scripts/verify-dist.mjs';

const CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'" />';

function makeDist(html: string, files: string[] = ['assets/index-abc.js', 'assets/index-abc.css', 'assets/tfjs-xyz.js', 'favicon.svg', 'theme-init.js']): string {
  const dir = mkdtempSync(join(tmpdir(), 'openml-dist-'));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  for (const f of files) writeFileSync(join(dir, f), '/* test */');
  writeFileSync(join(dir, 'index.html'), html);
  return dir;
}

const page = (base: string) => `<!doctype html><html><head>${CSP}
<link rel="icon" href="${base}favicon.svg" />
<script src="${base}theme-init.js"></script>
<script type="module" crossorigin src="${base}assets/index-abc.js"></script>
<link rel="stylesheet" href="${base}assets/index-abc.css" /></head><body></body></html>`;

describe('verifyDist (production asset paths)', () => {
  it('accepts a correct project-site build served from /openml-lab/', () => {
    const dir = makeDist(page('/openml-lab/'));
    const r = verifyDist(dir, '/openml-lab/');
    expect(r.errors).toEqual([]);
    expect(r.checked).toHaveLength(4);
    rmSync(dir, { recursive: true });
  });

  it('accepts a root build and normalises a base given without slashes', () => {
    const dir = makeDist(page('/'));
    expect(verifyDist(dir, '/').errors).toEqual([]);
    const dir2 = makeDist(page('/openml-lab/'));
    expect(verifyDist(dir2, 'openml-lab').errors).toEqual([]);
    rmSync(dir, { recursive: true });
    rmSync(dir2, { recursive: true });
  });

  it('flags the classic bug: root-absolute asset paths on a project site', () => {
    const dir = makeDist(page('/'));
    const r = verifyDist(dir, '/openml-lab/');
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
    expect(r.errors[0]).toContain('root-absolute');
    rmSync(dir, { recursive: true });
  });

  it('flags missing files, unreplaced placeholders and a missing CSP tag', () => {
    const dir = makeDist(page('/openml-lab/').replace('assets/index-abc.js', 'assets/gone.js'));
    expect(verifyDist(dir, '/openml-lab/').errors.some((e) => e.includes('does not exist'))).toBe(true);

    const raw = makeDist(page('/openml-lab/').replace('/openml-lab/favicon.svg', '%BASE_URL%favicon.svg'));
    expect(verifyDist(raw, '/openml-lab/').errors.some((e) => e.includes('%BASE_URL%'))).toBe(true);

    const noCsp = makeDist(page('/openml-lab/').replace(CSP, '<!--CSP-->'));
    expect(verifyDist(noCsp, '/openml-lab/').errors.some((e) => e.includes('Content-Security-Policy'))).toBe(true);
    for (const d of [dir, raw, noCsp]) rmSync(d, { recursive: true });
  });

  it('flags path traversal, relative paths and an eagerly loaded TensorFlow.js chunk', () => {
    const traversal = makeDist(page('/openml-lab/').replace('assets/index-abc.css', '../../etc/passwd'));
    expect(verifyDist(traversal, '/openml-lab/').errors.some((e) => e.includes('outside dist'))).toBe(true);

    const relative = makeDist(page('/openml-lab/').replace('/openml-lab/theme-init.js', 'theme-init.js'));
    expect(verifyDist(relative, '/openml-lab/').errors.some((e) => e.includes('relative path'))).toBe(true);

    const eager = makeDist(page('/openml-lab/').replace('</head>', '<link rel="modulepreload" href="/openml-lab/assets/tfjs-xyz.js" /></head>'));
    expect(verifyDist(eager, '/openml-lab/').errors.some((e) => e.includes('eagerly'))).toBe(true);
    for (const d of [traversal, relative, eager]) rmSync(d, { recursive: true });
  });

  it('ignores external URLs, data URIs and anchors', () => {
    const html = page('/openml-lab/').replace('</body>', '<a href="https://example.com">x</a><a href="#main">y</a><img src="data:image/png;base64,AAAA" alt=""></body>');
    const dir = makeDist(html);
    expect(verifyDist(dir, '/openml-lab/').errors).toEqual([]);
    rmSync(dir, { recursive: true });
  });

  it('reports a missing dist folder clearly', () => {
    expect(verifyDist(join(tmpdir(), 'definitely-not-here-openml'), '/').errors[0]).toContain('npm run build');
  });
});
