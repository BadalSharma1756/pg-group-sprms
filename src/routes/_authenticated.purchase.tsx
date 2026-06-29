import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus, Calculator } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtCurrency, fmtDate } from "@/lib/format";
import { ExportMenu } from "@/components/export-menu";
import { ExcelImport } from "@/components/excel-import";

export const Route = createFileRoute("/_authenticated/purchase")({ component: Page });

function Page() {
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey:["purchase"], queryFn: async () =>
    (await supabase.from("purchase_orders").select("*, suppliers(code,name), materials(code,name), plants(code)").order("po_date",{ascending:false}).limit(200)).data });
  const { data: suppliers } = useQuery({ queryKey:["sup-lite"], queryFn: async () => (await supabase.from("suppliers").select("id,code,name").eq("status","active")).data });
  const { data: materials } = useQuery({ queryKey:["mat-lite-po"], queryFn: async () => (await supabase.from("materials").select("id,code,name").eq("status","active")).data });
  const { data: plants } = useQuery({ queryKey:["plants-lite-po"], queryFn: async () => (await supabase.from("plants").select("id,code,name").eq("status","active")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ po_date:new Date().toISOString().slice(0,10), invoice_no:"", invoice_date:"", supplier_id:"", material_id:"", plant_id:"", quantity:0, rate:0, gst_pct:18, transport:0, received_qty:0, remarks:"" });

  const calc = useMemo(()=>{
    const sub = f.quantity * f.rate;
    const gst = sub * (f.gst_pct/100);
    return { sub, gst, total: sub+gst+(f.transport||0) };
  },[f.quantity,f.rate,f.gst_pct,f.transport]);

  const create = useMutation({
    mutationFn: async () => {
      const payload:any = { ...f, status: "approved" };
      if (!payload.invoice_date) delete payload.invoice_date;
      if (!payload.invoice_no) delete payload.invoice_no;
      const { error } = await supabase.from("purchase_orders").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Purchase booked — stock received"); setOpen(false);
      setF({ po_date:new Date().toISOString().slice(0,10), invoice_no:"", invoice_date:"", supplier_id:"", material_id:"", plant_id:"", quantity:0, rate:0, gst_pct:18, transport:0, received_qty:0, remarks:"" });
      qc.invalidateQueries({queryKey:["purchase"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  const importRows = async (rows: Record<string, any>[]) => {
    const errors: { row: number; msg: string }[] = [];
    let ok = 0;
    const supByCode = new Map((suppliers ?? []).map((s:any)=>[s.code, s.id]));
    const matByCode = new Map((materials ?? []).map((m:any)=>[m.code, m.id]));
    const plByCode = new Map((plants ?? []).map((p:any)=>[p.code, p.id]));
    for (let i=0;i<rows.length;i++){
      const r = rows[i];
      const supplier_id = supByCode.get(String(r.supplier_code).trim());
      const material_id = matByCode.get(String(r.material_code).trim());
      const plant_id = plByCode.get(String(r.plant_code).trim());
      if (!supplier_id) { errors.push({ row:i+2, msg:`Unknown supplier_code ${r.supplier_code}` }); continue; }
      if (!material_id) { errors.push({ row:i+2, msg:`Unknown material_code ${r.material_code}` }); continue; }
      if (!plant_id) { errors.push({ row:i+2, msg:`Unknown plant_code ${r.plant_code}` }); continue; }
      const qty = Number(r.quantity), rate = Number(r.rate);
      if (!isFinite(qty) || qty<=0) { errors.push({ row:i+2, msg:"quantity must be > 0" }); continue; }
      if (!isFinite(rate) || rate<0) { errors.push({ row:i+2, msg:"rate must be a number" }); continue; }
      const { error } = await supabase.from("purchase_orders").insert({
        po_date: r.po_date, supplier_id, material_id, plant_id,
        quantity: qty, rate, gst_pct: Number(r.gst_pct ?? 18),
        transport: Number(r.transport ?? 0), received_qty: Number(r.received_qty ?? 0),
        invoice_no: r.invoice_no || null, remarks: r.remarks ?? null, status: "approved",
      });
      if (error) errors.push({ row:i+2, msg:error.message }); else ok++;
    }
    qc.invalidateQueries({queryKey:["purchase"]});
    return { ok, errors };
  };

  return (
    <>
      <PageHeader title="Purchase Orders" subtitle="GST and totals auto-calculated; booking posts inventory IN"
        actions={
          <div className="flex items-center gap-2">
          <ExportMenu filename="purchase_orders" title="Purchase Orders"
            rows={data ?? []}
            columns={[
              { header:"PO #", accessor:(r:any)=>r.po_no },
              { header:"Date", accessor:(r:any)=>r.po_date },
              { header:"Supplier", accessor:(r:any)=> r.suppliers ? `${r.suppliers.code} ${r.suppliers.name}` : "" },
              { header:"Material", accessor:(r:any)=> r.materials ? `${r.materials.code} ${r.materials.name}` : "" },
              { header:"Plant", accessor:(r:any)=>r.plants?.code ?? "" },
              { header:"Qty", accessor:(r:any)=>r.quantity },
              { header:"Rate", accessor:(r:any)=>r.rate },
              { header:"GST %", accessor:(r:any)=>r.gst_pct },
              { header:"Total", accessor:(r:any)=>r.total_amount },
              { header:"Pending", accessor:(r:any)=>r.pending_qty },
            ]} />
          <ExcelImport templateName="purchase_template"
            fields={[
              { key:"po_date", label:"po_date", required:true, type:"date" },
              { key:"supplier_code", label:"supplier_code", required:true },
              { key:"material_code", label:"material_code", required:true },
              { key:"plant_code", label:"plant_code", required:true },
              { key:"quantity", label:"quantity", required:true, type:"number" },
              { key:"rate", label:"rate", required:true, type:"number" },
              { key:"gst_pct", label:"gst_pct", type:"number" },
              { key:"transport", label:"transport", type:"number" },
              { key:"received_qty", label:"received_qty", type:"number" },
              { key:"invoice_no", label:"invoice_no" },
              { key:"remarks", label:"remarks" },
            ]}
            sample={[new Date().toISOString().slice(0,10), "SUP-01", "MAT-001", "PL-01", 100, 250, 18, 500, 0, "INV-1001", ""]}
            onImport={importRows} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New PO</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>PO Date</Label><Input type="date" value={f.po_date} onChange={(e)=>setF({...f, po_date:e.target.value})}/></div>
                  <div><Label>Invoice #</Label><Input value={f.invoice_no} onChange={(e)=>setF({...f, invoice_no:e.target.value})}/></div>
                  <div><Label>Invoice date</Label><Input type="date" value={f.invoice_date} onChange={(e)=>setF({...f, invoice_date:e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Supplier</Label>
                    <Select value={f.supplier_id} onValueChange={(v)=>setF({...f, supplier_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Supplier"/></SelectTrigger>
                      <SelectContent>{(suppliers ?? []).map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Material</Label>
                    <Select value={f.material_id} onValueChange={(v)=>setF({...f, material_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
                      <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Plant</Label>
                    <Select value={f.plant_id} onValueChange={(v)=>setF({...f, plant_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Plant"/></SelectTrigger>
                      <SelectContent>{(plants ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div><Label>Qty</Label><Input type="number" value={f.quantity} onChange={(e)=>setF({...f, quantity:Number(e.target.value)})}/></div>
                  <div><Label>Rate</Label><Input type="number" step="0.01" value={f.rate} onChange={(e)=>setF({...f, rate:Number(e.target.value)})}/></div>
                  <div><Label>GST %</Label><Input type="number" step="0.01" value={f.gst_pct} onChange={(e)=>setF({...f, gst_pct:Number(e.target.value)})}/></div>
                  <div><Label>Transport</Label><Input type="number" step="0.01" value={f.transport} onChange={(e)=>setF({...f, transport:Number(e.target.value)})}/></div>
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-xs">
                  <div className="flex items-center gap-2 font-medium text-foreground mb-2"><Calculator className="size-4 text-primary"/>Auto totals</div>
                  <div className="grid grid-cols-3 gap-2 tabular-nums">
                    <div><div className="text-muted-foreground">Sub-total</div><div className="font-semibold">{fmtCurrency(calc.sub)}</div></div>
                    <div><div className="text-muted-foreground">GST</div><div className="font-semibold">{fmtCurrency(calc.gst)}</div></div>
                    <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{fmtCurrency(calc.total)}</div></div>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.supplier_id || !f.material_id || !f.plant_id || f.quantity<=0 || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"PO #", cell:(r:any)=> <span className="font-mono text-xs">{r.po_no}</span> },
          { header:"Date", cell:(r:any)=> fmtDate(r.po_date) },
          { header:"Supplier", cell:(r:any)=> r.suppliers ? `${r.suppliers.code}` : "—" },
          { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
          { header:"Plant", cell:(r:any)=> r.plants?.code ?? "—" },
          { header:"Qty", cell:(r:any)=> fmtNum(r.quantity) },
          { header:"Rate", cell:(r:any)=> fmtCurrency(r.rate) },
          { header:"Total", cell:(r:any)=> fmtCurrency(r.total_amount) },
          { header:"Pending", cell:(r:any)=> fmtNum(r.pending_qty) },
        ]} />
      </PageBody>
    </>
  );
}