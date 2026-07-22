import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/receipts")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data: receipts } = useQuery({ queryKey:["receipts"], queryFn: async () =>
    (await supabase.from("material_receipts").select("*, suppliers(code,name), purchase_orders(po_no), material_receipt_items(id,received_qty)").order("invoice_date",{ascending:false}).limit(200)).data });
  const { data: openPOs } = useQuery({ queryKey:["open-pos"], queryFn: async () =>
    (await supabase.from("purchase_orders").select("id,po_no,supplier_id,suppliers(name),purchase_order_items(id,material_id,uom,ordered_qty,received_qty,pending_qty,materials(code,name))").in("status",["open","partial"]).order("po_date",{ascending:false})).data });

  const [open, setOpen] = useState(false);
  const [po_id, setPO] = useState("");
  const [invoice_no, setInv] = useState("");
  const [invoice_date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [remarks, setRemarks] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const po = useMemo(()=> (openPOs ?? []).find((p:any)=>p.id===po_id), [openPOs, po_id]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!po) throw new Error("Pick a PO");
      if (!invoice_no) throw new Error("Invoice number required");
      const items = (po.purchase_order_items ?? []).filter((it:any)=> Number(qtys[it.id] || 0) > 0);
      if (!items.length) throw new Error("Enter received qty for at least one line");

      const { data: rcpt, error } = await supabase.from("material_receipts").insert({
        receipt_no: "", po_id: po.id, invoice_no, invoice_date, supplier_id: po.supplier_id, remarks,
      }).select("id").single();
      if (error) throw error;
      const rows = items.map((it:any) => ({
        receipt_id: rcpt!.id, po_item_id: it.id, material_id: it.material_id,
        received_qty: Number(qtys[it.id]), uom: it.uom,
      }));
      const { error: e2 } = await supabase.from("material_receipt_items").insert(rows);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Receipt posted — inventory updated"); setOpen(false); setPO(""); setInv(""); setRemarks(""); setQtys({}); qc.invalidateQueries({queryKey:["receipts"]}); qc.invalidateQueries({queryKey:["open-pos"]}); qc.invalidateQueries({queryKey:["stock"]}); qc.invalidateQueries({queryKey:["pos"]}); },
    onError: (e:any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Material Receipts" subtitle="Record invoices against POs; stock updates automatically"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New receipt</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>New Material Receipt</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Purchase Order</Label>
                    <Select value={po_id} onValueChange={setPO}>
                      <SelectTrigger><SelectValue placeholder="Open POs"/></SelectTrigger>
                      <SelectContent>{(openPOs ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.po_no} — {(p.suppliers as any)?.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Invoice date</Label><Input type="date" value={invoice_date} onChange={(e)=>setDate(e.target.value)}/></div>
                </div>
                <div><Label>Invoice number</Label><Input value={invoice_no} onChange={(e)=>setInv(e.target.value)}/></div>
                {po && (
                  <div className="rounded border">
                    <div className="p-2 border-b bg-muted/40 text-xs font-medium">Lines from {po.po_no}</div>
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground"><tr><th className="text-left p-2">Material</th><th className="text-right p-2">Ordered</th><th className="text-right p-2">Received so far</th><th className="text-right p-2">Pending</th><th className="text-right p-2">Receive now</th></tr></thead>
                      <tbody>
                        {(po.purchase_order_items ?? []).map((it:any)=>(
                          <tr key={it.id} className="border-t">
                            <td className="p-2">{it.materials?.code} — {it.materials?.name}</td>
                            <td className="p-2 text-right tabular-nums">{fmtNum(it.ordered_qty,3)} {it.uom}</td>
                            <td className="p-2 text-right tabular-nums">{fmtNum(it.received_qty,3)}</td>
                            <td className="p-2 text-right tabular-nums font-semibold">{fmtNum(it.pending_qty,3)}</td>
                            <td className="p-2"><Input className="h-8 text-right" type="number" step="0.001" value={qtys[it.id] ?? ""} onChange={(e)=>setQtys({...qtys, [it.id]: Number(e.target.value)})}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={(e)=>setRemarks(e.target.value)}/></div>
              </div>
              <DialogFooter><Button onClick={()=>submit.mutate()} disabled={submit.isPending}>Post receipt</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={receipts ?? undefined} columns={[
          { header:"GRN #", cell:(r:any)=> <span className="font-mono text-xs">{r.receipt_no}</span> },
          { header:"PO #", cell:(r:any)=> r.purchase_orders?.po_no ?? "—" },
          { header:"Invoice #", cell:(r:any)=> r.invoice_no },
          { header:"Invoice date", cell:(r:any)=> fmtDate(r.invoice_date) },
          { header:"Supplier", cell:(r:any)=> r.suppliers ? `${r.suppliers.code} — ${r.suppliers.name}` : "—" },
          { header:"Lines", cell:(r:any)=> r.material_receipt_items?.length ?? 0 },
        ]} />
      </PageBody>
    </>
  );
}
