import type { Table } from '../utils/csv';
import { sanitizeText } from '../utils/sanitize';

const PREVIEW_ROWS = 10;

/** Column summary and first rows. Every cell is sanitised and length-limited before display. */
export function DataPreview({ table }: { table: Table }) {
  const rows = table.rows.slice(0, PREVIEW_ROWS);
  return (
    <div className="stack">
      <div className="table-wrap">
        <table>
          <caption>
            Columns ({table.columns.length}) and rows ({table.rows.length})
          </caption>
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Type</th>
              <th scope="col">Missing</th>
              <th scope="col">Distinct values</th>
            </tr>
          </thead>
          <tbody>
            {table.columns.map((c) => (
              <tr key={c.name}>
                <th scope="row">{sanitizeText(c.name, 40)}</th>
                <td>{c.type}</td>
                <td>{c.missing}</td>
                <td>{c.unique}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <caption>
            First {rows.length} row(s). Missing values are shown as “∅”.
          </caption>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c.name} scope="col">
                  {sanitizeText(c.name, 24)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className={cell === null ? 'cell-missing' : ''}>
                    {cell === null ? '∅' : sanitizeText(cell, 24)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
