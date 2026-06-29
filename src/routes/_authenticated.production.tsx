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
import { Plus, Calculator, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/production")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { hasAny } = useAuth();
  const canApprove = hasAny(["super_admin","plant_admin","production_manager","store_manager"]);

  const { data } = useQuery({
    queryKey:["production"],
    queryFn: async () => (await supabase.from("production_entries")
      .select("*, products(code,name), plants(code), departments(code), materials(code,name)")
      .order("entry_date",{ascending:false}).limit(200)).data,
  });
  const { data: products } = useQuery({ queryKey:["prod-products"], queryFn: async () => (await supabase.from("products").select("id,code,name,plant_id,department_id,material_id,total_meter,pipes_required_6m,pipes_required_4m")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ entry_date:new Date().toISOString().slice(0,10), shift:"day", product_id:"", quantity:0, remarks:"" });
  const product = (products ?? []).find((p:any)=>p.id===f.product_id);
  const preview = useMemo(()=>{
    if(!product) return null;
    return {
      meters: (product.total_meter ?? 0) * f.quantity,
      p6: (product.pipes_required_6m ?? 0) * f.quantity,
      p4: (product.pipes_required_4m ?? 0) * f.quantity,
    };
  },[product, f.quantity]);

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
      setF({ entry_date:new Date().toISOString().slice(0,10), shift:"day", product_id:"", quantity:0, remarks:"" });
      qc.invalidateQueries({queryKey:["production"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id:string) => { const { error } = await supabase.from("production_entries").update({ approval_status:"approved", approved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Approved — inventory updated"); qc.invalidateQueries({queryKey:["production"]}); },
    onError:(e:any)=>toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Production" subtitle="Daily shift-wise production booking with automatic raw-material consumption"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Book production</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={f.entry_date} onChange={(e)=>setF({...f, entry_date:e.target.value})}/></div>
                  <div><Label>Shift</Label>
                    <Select value={f.shift} onValueChange={(v)=>setF({...f, shift:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem><SelectItem value="night">Night</SelectItem><SelectItem value="general">General</SelectItem>
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
                {preview && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="flex items-center gap-2 font-medium text-foreground mb-2"><Calculator className="size-4 text-primary"/>Auto consumption</div>
                    <div className="grid grid-cols-3 gap-2 tabular-nums">
                      <div><div className="text-muted-foreground">Meters</div><div className="font-semibold">{fmtNum(preview.meters,3)}</div></div>
                      <div><div className="text-muted-foreground">6 m pipes</div><div className="font-semibold">{fmtNum(preview.p6,3)}</div></div>
                      <div><div className="text-muted-foreground">4 m pipes</div><div className="font-semibold">{fmtNum(preview.p4,3)}</div></div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.product_id || f.quantity<=0 || create.isPending}>Save (draft)</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Date", cell:(r:any)=> fmtDate(r.entry_date) },
          { header:"Shift", cell:(r:any)=> <Badge variant="outline" className="capitalize">{r.shift}</Badge> },
          { header:"Product", cell:(r:any)=> r.products ? `${r.products.code} — ${r.products.name}` : "—" },
          { header:"Plant / Dept", cell:(r:any)=> `${r.plants?.code ?? "—"} / ${r.departments?.code ?? "—"}` },
          { header:"Qty", cell:(r:any)=> fmtNum(r.quantity) },
          { header:"Meters", cell:(r:any)=> fmtNum(r.total_meter_consumption,3) },
          { header:"6 m / 4 m", cell:(r:any)=> `${fmtNum(r.pipes_consumed_6m,2)} / ${fmtNum(r.pipes_consumed_4m,2)}` },
          { header:"Status", cell:(r:any)=> <Badge variant={r.approval_status==="approved"?"default":r.approval_status==="rejected"?"destructive":"secondary"} className="capitalize">{r.approval_status}</Badge> },
          { header:"", cell:(r:any)=> canApprove && r.approval_status!=="approved"
            ? <Button size="sm" variant="outline" onClick={()=>approve.mutate(r.id)}><CheckCircle2 className="size-4 mr-1"/>Approve</Button>
            : null },
        ]} />
      </PageBody>
    </>
  );
}