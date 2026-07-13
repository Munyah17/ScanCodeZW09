import { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';

/**
 * Drop into any page with a data table: <ExportButtons filename="users" title="All Users" headers={[...]} rows={[...]} />
 * headers: string[] — column labels
 * rows: array of arrays — one array of cell values per row, same order as headers
 */
export default function ExportButtons({ filename, title, headers, rows, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const isDisabled = disabled || !rows || rows.length === 0;

  const doExport = (fmt) => {
    setOpen(false);
    if (fmt === 'csv') exportToCSV(filename, headers, rows);
    else exportToPDF(filename, title ?? filename, headers, rows);
  };

  return (
    <div className="dp-export-menu" ref={rootRef}>
      <button
        type="button"
        className="dp-btn dp-btn-ghost dp-btn-sm"
        onClick={() => setOpen(o => !o)}
        disabled={isDisabled}
        title={isDisabled ? 'No data to export' : 'Export this table'}
      >
        <i className="fas fa-download" style={{ marginRight: '0.35rem' }} /> Export
      </button>
      {open && (
        <div className="dp-export-dropdown">
          <button className="dp-export-item" onClick={() => doExport('csv')}>
            <i className="fas fa-file-csv" /> CSV (Excel / Access)
          </button>
          <button className="dp-export-item" onClick={() => doExport('pdf')}>
            <i className="fas fa-file-pdf" /> PDF
          </button>
        </div>
      )}
    </div>
  );
}
