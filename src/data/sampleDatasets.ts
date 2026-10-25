@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root {
  color-scheme: dark;
  --bg: #07111f;
  --bg-strong: #0d1728;
  --panel: rgba(16, 25, 40, 0.8);
  --panel-soft: rgba(23, 36, 52, 0.8);
  --border: rgba(148, 163, 184, 0.2);
  --text: #e5eefc;
  --muted: #aab9d3;
  --accent: #60a5fa;
  --accent-soft: #38bdf8;
  --success: #34d399;
  --shadow: 0 24px 80px rgba(15, 23, 42, 0.25);
}

:root[data-theme='light'] {
  color-scheme: light;
  --bg: #edf4ff;
  --bg-strong: #f9fbff;
  --panel: rgba(255, 255, 255, 0.8);
  --panel-soft: rgba(242, 246, 255, 0.9);
  --border: rgba(103, 112, 146, 0.18);
  --text: #14213d;
  --muted: #4c5b75;
  --accent: #2563eb;
  --accent-soft: #38bdf8;
  --success: #059669;
  --shadow: 0 24px 80px rgba(86, 106, 146, 0.15);
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(96, 165, 250, 0.22), transparent 40%), linear-gradient(135deg, var(--bg), var(--bg-strong));
  color: var(--text);
  font-family: 'Inter', sans-serif;
}

button, input, select {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  width: min(1200px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid var(--border);
  border-radius: 18px;
  backdrop-filter: blur(14px);
  position: sticky;
  top: 1rem;
  z-index: 10;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  color: white;
  font-weight: 800;
}

.brand-name {
  font-weight: 800;
  letter-spacing: -0.04em;
}

.brand-tag {
  color: var(--muted);
  font-size: 0.75rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nav-btn, .theme-toggle, .primary, .secondary, .small-primary, .download-link, .file-picker {
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 0.7rem 1rem;
  font-weight: 600;
  transition: 180ms ease;
}

.nav-btn {
  background: transparent;
  color: var(--muted);
}

.nav-btn.active {
  background: rgba(96, 165, 250, 0.12);
  color: var(--text);
  border-color: var(--border);
}

.primary, .small-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-soft));
  color: white;
  box-shadow: var(--shadow);
}

.secondary {
  background: rgba(148, 163, 184, 0.08);
  border-color: var(--border);
  color: var(--text);
}

.theme-toggle {
  background: rgba(148, 163, 184, 0.08);
  border-color: var(--border);
  color: var(--text);
}

.page-shell {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow);
}

.hero {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1.5rem;
  padding: 2rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent-soft);
  font-size: 0.75rem;
  margin-bottom: 0.8rem;
  font-weight: 700;
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.5rem, 4vw, 4.3rem);
  letter-spacing: -0.07em;
  line-height: 0.95;
}

.lead {
  color: var(--muted);
  font-size: 1.05rem;
  max-width: 58ch;
  line-height: 1.7;
}

.cta-row {
  display: flex;
  gap: 1rem;
  margin: 1.5rem 0 1rem;
  flex-wrap: wrap;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.4rem;
  color: var(--muted);
}

.feature-list li::before {
  content: '•';
  color: var(--success);
  margin-right: 0.6rem;
}

.subtle {
  padding: 1rem;
}

.visual-stage {
  background: rgba(8, 15, 28, 0.7);
  border-radius: 18px;
  border: 1px solid var(--border);
  padding: 1rem;
}

.hud-title {
  color: var(--muted);
  margin-bottom: 1rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: var(--panel-soft);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-card span {
  color: var(--muted);
  font-size: 0.78rem;
}

.stat-card strong {
  font-size: 1.4rem;
}

.line-chart {
  width: 100%;
  height: 160px;
  margin-top: 1rem;
  stroke: var(--accent);
  fill: none;
  stroke-width: 3;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.feature-card {
  padding: 1.1rem;
}

.feature-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(56, 189, 248, 0.18));
  margin-bottom: 0.8rem;
  font-size: 1.5rem;
}

.feature-card h3 {
  margin: 0.3rem 0;
}

.feature-card p,
.docs-panel p,
.about-panel p,
.checklist li,
.panel p,
.metric-list p {
  color: var(--muted);
  line-height: 1.7;
}

.dashboard-grid,
.dataset-layout,
.training-layout,
.docs-grid,
.about-layout {
  display: grid;
  gap: 1rem;
}

.dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.demo-panel, .dataset-panel, .dataset-side, .docs-panel, .about-panel, .chart-panel, .metrics-panel {
  padding: 1.3rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.panel-header h2,
.docs-panel h2,
.about-panel h2,
.chart-panel h3,
.metrics-panel h3 {
  margin: 0;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.field-grid.single { grid-template-columns: 1fr; }

label {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: var(--muted);
}

input, select {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.25);
  color: var(--text);
  padding: 0.8rem 0.9rem;
}

input[type='file'] { display: none; }

.result-box {
  margin-top: 1rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(96, 165, 250, 0.05);
  padding: 1rem;
}

.result-box h3 { margin-top: 0; }

.prediction-text {
  font-size: 1.05rem;
  color: var(--text);
  font-weight: 600;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--border);
}

.metric-row:first-of-type { border-top: none; }

.dataset-layout { grid-template-columns: 1.75fr 0.8fr; }

.upload-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.file-picker {
  display: inline-flex;
  padding: 0.7rem 1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.06);
  color: var(--text);
  font-weight: 600;
}

.download-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--border);
  color: var(--text);
  text-decoration: none;
}

.column-selectors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 540px;
}

th, td {
  text-align: left;
  padding: 0.75rem 0.8rem;
  border-bottom: 1px solid var(--border);
}

th { background: rgba(148, 163, 184, 0.06); }

.error-box {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 12px;
  color: #fecaca;
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
}

.checklist {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.65rem;
}

.small-card {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 14px;
  background: rgba(96, 165, 250, 0.06);
  border: 1px solid var(--border);
}

.pill {
  display: inline-block;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.12);
  color: var(--accent-soft);
  font-size: 0.72rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}

.training-layout { grid-template-columns: 1.2fr 1fr 0.8fr; }

.training-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
  margin-bottom: 1rem;
}

.progress-wrap {
  display: grid;
  gap: 0.75rem;
}

.progress-bar {
  height: 12px;
  width: 100%;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  overflow: hidden;
}

.progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--success));
  width: 0;
  transition: width 180ms ease;
}

.chart-empty {
  height: 120px;
  display: grid;
  place-items: center;
  color: var(--muted);
}

.mini-chart {
  width: 100%;
  height: 110px;
  margin-top: 0.5rem;
}

.doc-list {
  display: grid;
  gap: 1rem;
}

.doc-list article {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.04);
}

@media (max-width: 980px) {
  .hero,
  .dashboard-grid,
  .dataset-layout,
  .training-layout,
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .topbar { flex-wrap: wrap; }
}

@media (max-width: 640px) {
  .app-shell {
    width: min(100% - 1rem, 1200px);
    padding-top: 1rem;
  }

  .topbar { padding: 0.85rem; }

  .nav {
    width: 100%;
    justify-content: space-between;
  }

  .hero,
  .demo-panel,
  .dataset-panel,
  .dataset-side,
  .docs-panel,
  .about-panel,
  .chart-panel,
  .metrics-panel {
    padding: 1rem;
  }

  .field-grid,
  .column-selectors,
  .training-controls {
    grid-template-columns: 1fr;
  }
}
