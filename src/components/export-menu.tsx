import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { exportCSV, exportXLSX, exportPDF, type ExportColumn } from "@/lib/export";

export function ExportMenu<T>({ filename, title, rows, columns, meta }: {
  filename: string; title: string; rows: T[]; columns: ExportColumn<T>[]; meta?: Record<string, string>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!rows?.length}>
          <Download className="size-4 mr-1" />Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportCSV(filename, rows, columns)}>
          <FileType className="size-4 mr-2" />CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportXLSX(filename, rows, columns)}>
          <FileSpreadsheet className="size-4 mr-2" />Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(filename, title, rows, columns, meta)}>
          <FileText className="size-4 mr-2" />PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}