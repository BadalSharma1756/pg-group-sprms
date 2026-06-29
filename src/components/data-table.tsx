import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  rows, columns, empty = "No records yet",
}: { rows: T[] | undefined; columns: Column<T>[]; empty?: string }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>{columns.map((c, i) => <TableHead key={i} className={c.className}>{c.header}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {!rows ? (
            <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
          ) : rows.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">{empty}</TableCell></TableRow>
          ) : rows.map((r) => (
            <TableRow key={r.id}>
              {columns.map((c, i) => <TableCell key={i} className={cn("tabular-nums", c.className)}>{c.cell(r)}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}