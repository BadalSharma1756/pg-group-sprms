import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn<T = any> = { header: string; accessor: (row: T) => string | number | null | undefined };

function rowsToMatrix<T>(rows: T[], cols: ExportColumn<T>[]) {
  const header = cols.map((c) => c.header);
  const body = rows.map((r) => cols.map((c) => {
    const v = c.accessor(r);
    return v == null ? "" : v;
  }));
  return { header, body };
}

export function exportCSV<T>(filename: string, rows: T[], cols: ExportColumn<T>[]) {
  const { header, body } = rowsToMatrix(rows, cols);
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.map(esc).join(","), ...body.map((r) => r.map(esc).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export function exportXLSX<T>(filename: string, rows: T[], cols: ExportColumn<T>[], sheetName = "Sheet1") {
  const { header, body } = rowsToMatrix(rows, cols);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF<T>(filename: string, title: string, rows: T[], cols: ExportColumn<T>[], meta?: Record<string, string>) {
  const doc = new jsPDF({ orientation: "landscape" });
  const { header, body } = rowsToMatrix(rows, cols);
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 20);
  if (meta) {
    const parts = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join("   |   ");
    doc.text(parts, 14, 26);
  }
  autoTable(doc, {
    head: [header],
    body: body.map((r) => r.map((c) => String(c))),
    startY: meta ? 30 : 24,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
  });
  doc.save(`${filename}.pdf`);
}

export function downloadXLSXTemplate(filename: string, headers: string[], sample?: (string | number)[]) {
  const ws = XLSX.utils.aoa_to_sheet(sample ? [headers, sample] : [headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function parseXLSX(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}