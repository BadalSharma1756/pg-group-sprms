import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/purchase")({ component: Page });

type Line = { material_id: string; uom: "PCS"|"MTR"|"SET"; ordered_qty: number; rate: number };

function Page() {
  const qc = useQueryClient();
  const { data: pos } = useQuery({ queryKey:["pos"], queryFn: async () =>
    (await supabase.from("purchase_orders").select("*, suppliers(code,name), purchase_order_items(id,ordered_qty,received_qty)").order("po_date",{ascending:false}).limit(200)).data });
  const { data: suppliers } = useQuery({ queryKey:["po-sup"], queryFn: async () => (await supabase.from("suppliers").select("id,code,name").eq("status","active")).data });
  const { data: departments } = useQuery({ queryKey:["po-dept"], queryFn: async () => (await supabase.from("departments").select("id,code,name").eq("status","active")).data });
  const { data: materials } = useQuery({ queryKey:["po-mat"], queryFn: async () => (await supabase.from("materials").select("id,code,name,uom").eq("status","active")).data });

  const [open, setOpen] = useState(false);
  const [supplier_id, setSupplier] = useState("");
  const [department_id, setDept] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const addLine = () => setLines([...lines, { material_id:"", uom:"PCS", ordered_qty:0, rate:0 }]);
  const rmLine = (i:number) => setLines(lines.filter((_,j)=>j!==i));
  const updLine = (i:number, patch: Partial<Line>) => setLines(lines.map((l,j)=> j===i ? {...l, ...patch} : l));

  const create = useMutation({
    mutationFn: async () => {
      if (!supplier_id) throw new Error("Pick supplier");
      if (!lines.length) throw new Error("Add at least one line");
      const { data: po, error } = await supabase.from("purchase_orders").insert({
        po_no: "", supplier_id, department_id: department_id || null, remarks,
      }).select("id").single();
      if (error) throw error;
      const items = lines.map(l => ({ po_id: po!.id, ...l }));
      const { error: e2 } = await supabase.from("purchase_order_items").insert(items);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Purchase order created"); setOpen(false); setSupplier(""); setDept(""); setRemarks(""); setLines([]); qc.invalidateQueries({queryKey:["pos"]}); },
    onError: (e:any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="Multi-line orders; multiple invoices/receipts per PO"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New PO</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Supplier</Label>
                    <Select value={supplier_id} onValueChange={setSupplier}>
                      <SelectTrigger><SelectValue placeholder="Supplier"/></SelectTrigger>
                      <SelectContent>{(suppliers ?? []).map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Department</Label>
                    <Select value={department_id} onValueChange={setDept}>
                      <SelectTrigger><SelectValue placeholder="Department"/></SelectTrigger>
                      <SelectContent>{(departments ?? []).map((d:any)=> <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={(e)=>setRemarks(e.target.value)}/></div>
                <div className="rounded border">
                  <div className="flex items-center justify-between p-2 border-b bg-muted/40 text-xs font-medium">Line items <Button size="sm" variant="ghost" onClick={addLine}><Plus className="size-3 mr-1"/>Add line</Button></div>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr><th className="text-left p-2">Material</th><th className="p-2">UOM</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Rate</th><th></th></tr></thead>
                    <tbody>
                      {lines.map((l,i)=>(
                        <tr key={i} className="border-t">
                          <td className="p-1">
                            <Select value={l.material_id} onValueChange={(v)=>{ const m=(materials??[]).find((x:any)=>x.id===v); updLine(i,{ material_id:v, uom: m?.uom ?? "PCS" }); }}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Material"/></SelectTrigger>
                              <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-1 text-center">{l.uom}</td>
                          <td className="p-1"><Input className="h-8 text-right" type="number" step="0.001" value={l.ordered_qty} onChange={(e)=>updLine(i,{ ordered_qty:Number(e.target.value) })}/></td>
                          <td className="p-1"><Input className="h-8 text-right" type="number" step="0.0001" value={l.rate} onChange={(e)=>updLine(i,{ rate:Number(e.target.value) })}/></td>
                          <td className="p-1 text-right"><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={()=>rmLine(i)}><Trash2 className="size-4"/></Button></td>
                        </tr>
                      ))}
                      {lines.length===0 && <tr><td colSpan={5} className="text-center text-muted-foreground py-4">Add a line to get started</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={create.isPending}>Save PO</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={pos ?? undefined} columns={[
          { header:"PO #", cell:(r:any)=> <span className="font-mono text-xs">{r.po_no}</span> },
          { header:"Date", cell:(r:any)=> fmtDate(r.po_date) },
          { header:"Supplier", cell:(r:any)=> r.suppliers ? `${r.suppliers.code} — ${r.suppliers.name}` : "—" },
          { header:"Lines", cell:(r:any)=> r.purchase_order_items?.length ?? 0 },
          { header:"Amount", cell:(r:any)=> "₹ " + fmtNum(r.total_amount, 2) },
          { header:"Status", cell:(r:any)=> <Badge variant={r.status==="completed"?"default":r.status==="partial"?"secondary":"outline"}>{r.status}</Badge> },
        ]} />
      </PageBody>
    </>
  );
}
