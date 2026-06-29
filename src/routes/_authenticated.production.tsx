import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate } from "@/lib/format";
import { ExportMenu } from "@/components/export-menu";
import { ExcelImport } from "@/components/excel-import";

export const Route = createFileRoute("/_authenticated/production")({ component: Page });

function Page() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey:["production"],
    queryFn: async () => (await supabase.from("production_entries")
      .select("*, products(code,name), plants(code), departments(code), materials(code,name)")
      .order("entry_date",{ascending:false}).limit(200)).data,
  });
  const { data: products } = useQuery({ queryKey:["prod-products"], queryFn: async () => (await supabase.from("products").select("id,code,name,plant_id,department_id,material_id,total_meter,pipes_required_6m,pipes_required_4m")).data });

  const [open,setOpen]=useState(false);
  type Shift = "morning"|"afternoon"|"night"|"general";
  const [f,setF]=useState<{ entry_date:string; shift:Shift; product_id:string; quantity:number; remarks:string }>({ entry_date:new Date().toISOString().slice(0,10), shift:"morning", product_id:"", quantity:0, remarks:"" });
  const product = (products ?? []).find((p:any)=>p.id===f.product_id);

  const { data: bomRows } = useQuery({
    queryKey: ["bom-for-product", f.product_id],
    enabled: !!f.product_id,
    queryFn: async () => (await supabase.from("product_bom")
      .select("qty_per_unit, uom, materials(code,name)")
      .eq("product_id", f.product_id)).data,
  });
  const preview = useMemo(()=>{
    if(!product || !bomRows) return null;
    return (bomRows as any[]).map(b => ({
      mat: b.materials ? `${b.materials.code} — ${b.materials.name}` : "—",
      uom: b.uom,
      consume: Number(b.qty_per_unit) * Number(f.quantity || 0),
    }));
  },[product, bomRows, f.quantity]);

  const create = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Pick a product");
      const { error } = await supabase.from("production_entries").insert({
        entry_date: f.entry_date, shift: f.shift, product_id: f.product_id,
        plant_id: product.plant_id, department_id: product.department_id, material_id: product.material_id,
        quantity: f.quantity, remarks: f.remarks,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Production booked — consumption auto-calculated"); setOpen(false);
      setF({ entry_date:new Date().toISOString().slice(0,10), shift:"morning", product_id:"", quantity:0, remarks:"" });
      qc.invalidateQueries({queryKey:["production"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("production_entries").update({ status:"approved", approved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Approved — inventory updated"); qc.invalidateQueries({queryKey:["production"]}); },
    onError:(e:any)=>toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("production_entries").update({ status:"rejected" }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Entry rejected"); qc.invalidateQueries({queryKey:["production"]}); },
    onError:(e:any)=>toast.error(e.message),
  });

  const importRows = async (rows: Record<string, any>[]) => {
    const errors: { row: number; msg: string }[] = [];
    let ok = 0;
    const prodByCode = new Map((products ?? []).map((p:any)=>[p.code, p]));
    for (let i=0;i<rows.length;i++){
      const r = rows[i];
      const p:any = prodByCode.get(String(r.product_code).trim());
      if (!p) { errors.push({ row: i+2, msg: `Unknown product_code ${r.product_code}` }); continue; }
      const qty = Number(r.quantity);
      if (!isFinite(qty) || qty <= 0) { errors.push({ row: i+2, msg: "quantity must be > 0" }); continue; }
      const { error } = await supabase.from("production_entries").insert({
        entry_date: r.entry_date, shift: r.shift ?? "general", product_id: p.id,
        plant_id: p.plant_id, department_id: p.department_id, material_id: p.material_id,
        quantity: qty, remarks: r.remarks ?? null,
      });
      if (error) errors.push({ row: i+2, msg: error.message }); else ok++;
    }
    qc.invalidateQueries({queryKey:["production"]});
    return { ok, errors };
  };

  return (
    <>
      <PageHeader title="Production" subtitle="Daily shift-wise production booking with automatic raw-material consumption"
        actions={
          <div className="flex items-center gap-2">
          <ExportMenu filename="production_entries" title="Production Entries"
            rows={data ?? []}
            columns={[
              { header:"Date", accessor:(r:any)=>r.entry_date },
              { header:"Shift", accessor:(r:any)=>r.shift },
              { header:"Product", accessor:(r:any)=> r.products ? `${r.products.code} ${r.products.name}` : "" },
              { header:"Plant", accessor:(r:any)=>r.plants?.code ?? "" },
              { header:"Dept", accessor:(r:any)=>r.departments?.code ?? "" },
              { header:"Qty", accessor:(r:any)=>r.quantity },
              { header:"Meters", accessor:(r:any)=>r.total_meter_consumed },
              { header:"6m pipes", accessor:(r:any)=>r.pipes_consumed_6m },
              { header:"4m pipes", accessor:(r:any)=>r.pipes_consumed_4m },
              { header:"Status", accessor:(r:any)=>r.status },
            ]} />
          <ExcelImport templateName="production_template"
            fields={[
              { key:"entry_date", label:"entry_date", required:true, type:"date" },
              { key:"shift", label:"shift" },
              { key:"product_code", label:"product_code", required:true },
              { key:"quantity", label:"quantity", required:true, type:"number" },
              { key:"remarks", label:"remarks" },
            ]}
            sample={[new Date().toISOString().slice(0,10), "morning", "P-001", 10, "sample"]}
            onImport={importRows} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Book production</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={f.entry_date} onChange={(e)=>setF({...f, entry_date:e.target.value})}/></div>
                  <div><Label>Shift</Label>
                    <Select value={f.shift} onValueChange={(v)=>setF({...f, shift: v as Shift})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Product</Label>
                  <Select value={f.product_id} onValueChange={(v)=>setF({...f, product_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Product"/></SelectTrigger>
                    <SelectContent>{(products ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" value={f.quantity} onChange={(e)=>setF({...f, quantity:Number(e.target.value)})}/></div>
                <div><Label>Remarks</Label><Textarea rows={2} value={f.remarks} onChange={(e)=>setF({...f, remarks:e.target.value})}/></div>
                {preview && preview.length > 0 && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground mb-2"><Calculator className="size-4 text-primary"/>Auto consumption from BOM</div>
                    <div className="max-h-48 overflow-auto">
                      <table className="w-full tabular-nums">
                        <thead className="text-muted-foreground"><tr><th className="text-left py-1">Material</th><th className="text-right">Per unit</th><th className="text-right">Total</th><th className="text-left pl-2">UOM</th></tr></thead>
                        <tbody>{preview.map((p,i)=>(
                          <tr key={i} className="border-t border-border/40">
                            <td className="py-1">{p.mat}</td>
                            <td className="text-right">{fmtNum(p.consume / (f.quantity||1), 4)}</td>
                            <td className="text-right font-semibold">{fmtNum(p.consume, 3)}</td>
                            <td className="pl-2 text-muted-foreground">{p.uom}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.product_id || f.quantity<=0 || create.isPending}>Save (draft)</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Date", cell:(r:any)=> fmtDate(r.entry_date) },
          { header:"Shift", cell:(r:any)=> <Badge variant="outline" className="capitalize">{r.shift}</Badge> },
          { header:"Product", cell:(r:any)=> r.products ? `${r.products.code} — ${r.products.name}` : "—" },
          { header:"Plant / Dept", cell:(r:any)=> `${r.plants?.code ?? "—"} / ${r.departments?.code ?? "—"}` },
          { header:"Qty", cell:(r:any)=> fmtNum(r.quantity) },
          { header:"Meters", cell:(r:any)=> fmtNum(r.total_meter_consumed,3) },
          { header:"6 m / 4 m", cell:(r:any)=> `${fmtNum(r.pipes_consumed_6m,2)} / ${fmtNum(r.pipes_consumed_4m,2)}` },
          { header:"Status", cell:(r:any)=> <Badge variant={r.status==="approved"?"default":r.status==="rejected"?"destructive":"secondary"} className="capitalize">{r.status}</Badge> },
          { header:"", cell:(r:any)=> canApprove && r.status!=="approved" && r.status!=="rejected" ? (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={()=>approve.mutate(r.id)}><CheckCircle2 className="size-4 mr-1"/>Approve</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={()=>reject.mutate(r.id)}><XCircle className="size-4 mr-1"/>Reject</Button>
            </div>
          ) : null },
        ]} />
      </PageBody>
    </>
  );
}