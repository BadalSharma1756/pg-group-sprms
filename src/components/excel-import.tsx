import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import { parseXLSX, downloadXLSXTemplate } from "@/lib/export";
import { toast } from "sonner";

export type ImportField = { key: string; label: string; required?: boolean; type?: "number" | "date" | "text" };
export type ImportResult = { ok: number; errors: { row: number; msg: string }[] };

export function ExcelImport<T = any>({
  label = "Import Excel",
  templateName,
  fields,
  sample,
  onImport,
}: {
  label?: string;
  templateName: string;
  fields: ImportField[];
  sample?: (string | number)[];
  onImport: (rows: Record<string, any>[]) => Promise<ImportResult>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      const raw = await parseXLSX(file);
      const cleaned: Record<string, any>[] = [];
      const errors: { row: number; msg: string }[] = [];
      raw.forEach((r, i) => {
        const row: Record<string, any> = {};
        const rowNum = i + 2; // +header
        for (const f of fields) {
          let v = r[f.label] ?? r[f.key];
          if (v === "" || v == null) v = null;
          if (f.required && v == null) { errors.push({ row: rowNum, msg: `Missing ${f.label}` }); continue; }
          if (f.type === "number" && v != null) {
            const n = Number(v); if (!isFinite(n)) { errors.push({ row: rowNum, msg: `${f.label} must be number` }); continue; }
            v = n;
          }
          if (f.type === "date" && v instanceof Date) v = v.toISOString().slice(0,10);
          row[f.key] = v;
        }
        cleaned.push(row);
      });
      if (errors.length) { setResult({ ok: 0, errors }); setBusy(false); return; }
      const res = await onImport(cleaned);
      setResult(res);
      if (res.ok > 0) toast.success(`Imported ${res.ok} rows`);
      if (res.errors.length) toast.error(`${res.errors.length} rows failed`);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="size-4 mr-1" />{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded border bg-muted/40 p-3">
            <div className="font-medium mb-1">Required columns</div>
            <div className="text-muted-foreground text-xs">
              {fields.map(f => `${f.label}${f.required ? "*" : ""}`).join(", ")}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => downloadXLSXTemplate(templateName, fields.map(f=>f.label), sample)}>
              <Download className="size-4 mr-1" />Download template
            </Button>
          </div>
          <input type="file" accept=".xlsx,.xls" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground" />
          {busy && <div className="text-muted-foreground">Processing…</div>}
          {result && (
            <div className="space-y-2">
              <div>Imported: <b>{result.ok}</b> &nbsp; Failed: <b className={result.errors.length?"text-destructive":""}>{result.errors.length}</b></div>
              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-auto rounded border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted"><tr><th className="text-left p-2">Row</th><th className="text-left p-2">Error</th></tr></thead>
                    <tbody>{result.errors.map((e,i)=>(<tr key={i} className="border-t"><td className="p-2 font-mono">{e.row}</td><td className="p-2">{e.msg}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}