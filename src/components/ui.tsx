import type { ReactNode } from 'react';

export type AlertKind = 'error' | 'success' | 'info' | 'warning';

/** Status message. Errors are announced immediately (role="alert"); the rest politely (role="status"). */
export function Alert({ kind, title, children }: { kind: AlertKind; title?: string; children?: ReactNode }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`.trim()}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  );
}

export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="page-header">
      <h1 tabIndex={-1} id="page-title">
        {title}
      </h1>
      {lead && <p className="lead">{lead}</p>}
    </header>
  );
}

/** Colour for class index i, from a colour-blind-safe palette defined in CSS. */
export const classColor = (i: number): string => `var(--c${i % 8})`;

export function fmt(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '–';
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  return Number(value.toPrecision(digits)).toString();
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Trigger a browser download of text content created locally (nothing is uploaded). */
export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
