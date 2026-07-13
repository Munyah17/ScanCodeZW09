import { jsPDF } from 'jspdf';

function triggerDownload(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * CSV export — also the "Access" format: Microsoft Access, Excel, Google
 * Sheets, and virtually every other spreadsheet/database tool imports CSV
 * natively (File > External Data > Import > Text File in Access).
 */
export function exportToCSV(filename, headers, rows) {
  const escapeCell = (v) => {
    const s = cellToString(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];
  // Leading BOM so Excel/Access detect UTF-8 correctly instead of guessing Latin-1
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

/** Simple tabular PDF export — no external plugin, just jsPDF primitives. */
export function exportToPDF(filename, title, headers, rows) {
  const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait', unit: 'pt' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin     = 36;
  const usableW    = pageWidth - margin * 2;
  const colW       = usableW / headers.length;
  const rowH       = 20;
  let y = margin;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(title, margin, y);
  y += 10;
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, margin, y + 10);
  y += 26;

  const drawHeader = () => {
    doc.setFillColor(31, 41, 55);
    doc.rect(margin, y, usableW, rowH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8.5);
    headers.forEach((h, i) => {
      doc.text(cellToString(h), margin + i * colW + 4, y + rowH - 6, { maxWidth: colW - 6 });
    });
    y += rowH;
    doc.setTextColor(20, 20, 20);
    doc.setFont(undefined, 'normal');
  };

  drawHeader();

  rows.forEach((row, idx) => {
    if (y + rowH > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    if (idx % 2 === 1) {
      doc.setFillColor(245, 246, 248);
      doc.rect(margin, y, usableW, rowH, 'F');
    }
    row.forEach((cell, i) => {
      doc.text(cellToString(cell), margin + i * colW + 4, y + rowH - 6, { maxWidth: colW - 6 });
    });
    y += rowH;
  });

  doc.save(`${filename}.pdf`);
}
