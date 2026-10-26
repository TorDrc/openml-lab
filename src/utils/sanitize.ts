/**
 * Helpers for displaying and exporting user-provided text safely.
 *
 * React escapes text nodes by default and this project never uses
 * dangerouslySetInnerHTML. These helpers add defence in depth: they strip
 * control characters, bound the length of displayed values and neutralise
 * spreadsheet "formula injection" when data is exported back to CSV.
 */

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g;

export const MAX_DISPLAY_LENGTH = 80;

/** Remove control / bidi-override characters and bound the length. */
export function sanitizeText(value: unknown, maxLength = MAX_DISPLAY_LENGTH): string {
  const text = String(value ?? '').replace(CONTROL_CHARS, '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** A column name that is safe to show and to use as an object key. */
export function sanitizeColumnName(value: unknown, index: number): string {
  const cleaned = sanitizeText(value, 60).trim();
  return cleaned === '' ? `column_${index + 1}` : cleaned;
}

/** Prefix cells that spreadsheet software could interpret as a formula. */
export function neutraliseFormula(cell: string): string {
  return /^[=+\-@\t\r]/.test(cell) && Number.isNaN(Number(cell)) ? `'${cell}` : cell;
}

/** Quote a single CSV field per RFC 4180. */
export function toCsvField(value: string | number | null): string {
  if (value === null) return '';
  const text = neutraliseFormula(String(value));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
