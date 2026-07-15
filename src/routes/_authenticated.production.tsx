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
import { EntryListView } from "@/components/entry-list-view";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate } from "@/lib/format";
import { ExportMenu } from "@/components/export-menu";

export const Route = createFileRoute("/_authenticated/production")({ component: Page });

function Page() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey:["production"],
    queryFn: async () => (await supabase.from("production_entries")
      .select("*, products(code,name), plants(code), departments(code), materials(code,name), supervisors(name)")
      .order("entry_date",{ascending:false}).limit(200)).data,
  });
  const { data: products } = useQuery({ queryKey:["prod-products"], queryFn: async () => (await supabase.from("products").select("id,code,name,plant_id,department_id,material_id,total_meter,pipes_required_6m,pipes_required_4m").eq("status","active").order("name")).data });
  const { data: departments } = useQuery({ queryKey:["prod-departments"], queryFn: async () => (await supabase.from("departments").select("id,code,name,plant_id").eq("status","active").order("name")).data });
  const { data: supervisors } = useQuery({ queryKey:["prod-supervisors"], queryFn: async () => (await supabase.from("supervisors").select("id,name,department_id").eq("status","active").order("name")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState<{ product_id:string; department_id:string; supervisor_id:string; quantity:number; remarks:string }>({ product_id:"", department_id:"", supervisor_id:"", quantity:0, remarks:"" });
  const [newProdOpen, setNewProdOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const product = (products ?? []).find((p:any)=>p.id===f.product_id);
  const filteredSupervisors = (supervisors ?? []).filter((s:any)=> !f.department_id || s.department_id === f.department_id);

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

  const addProduct = useMutation({
    mutationFn: async () => {
      const name = newProdName.trim();
      if (!name) throw new Error("Enter a product name");
      const dept = (departments ?? []).find((d:any)=> d.id === f.department_id) ?? (departments ?? [])[0];
      if (!dept) throw new Error("Create a department first");
      const code = "P-" + name.toUpperCase().replace(/[^A-Z0-9]+/g,"-").slice(0,20) + "-" + Math.random().toString(36).slice(2,5).toUpperCase();
      const { data: p, error } = await supabase.from("products").insert({
        code, name, plant_id: dept.plant_id, department_id: dept.id,
      }).select("id,code,name,plant_id,department_id,material_id,total_meter,pipes_required_6m,pipes_required_4m").single();
      if (error) throw error;
      return p;
    },
    onSuccess: (p:any) => {
      toast.success(`Product "${p.name}" added`);
      setNewProdOpen(false); setNewProdName("");
      qc.invalidateQueries({ queryKey:["prod-products"] });
      setF((prev)=>({ ...prev, product_id: p.id }));
    },
    onError:(e:any)=>toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Pick a product");
      if (!f.department_id) throw new Error("Pick a department");
      const dept = (departments ?? []).find((d:any)=> d.id === f.department_id);
      const plant_id = product.plant_id ?? dept?.plant_id;
      if (!plant_id) throw new Error("No plant available");
      // material_id: from product, else first BOM material
      let material_id: string | null = product.material_id ?? null;
      if (!material_id) {
        const { data: bom } = await supabase.from("product_bom").select("material_id").eq("product_id", product.id).limit(1);
        material_id = bom?.[0]?.material_id ?? null;
      }
      const { error } = await supabase.from("production_entries").insert({
        entry_date: new Date().toISOString().slice(0,10),
        shift: "general",
        product_id: f.product_id,
        plant_id, department_id: f.department_id, material_id,
        supervisor_id: f.supervisor_id || null,
        quantity: f.quantity, remarks: f.remarks, status: "approved",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Production booked — inventory updated"); setOpen(false);
      setF({ product_id:"", department_id:"", supervisor_id:"", quantity:0, remarks:"" });
      qc.invalidateQueries({queryKey:["production"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Production" subtitle="Manual production entry with automatic BOM-based material consumption"
        actions={
          <div className="flex items-center gap-2">
          <ExportMenu filename="production_entries" title="Production Entries"
            rows={data ?? []}
            columns={[
              { header:"Date", accessor:(r:any)=>r.entry_date },
              { header:"Product", accessor:(r:any)=> r.products ? `${r.products.code} ${r.products.name}` : "" },
              { header:"Dept", accessor:(r:any)=>r.departments?.code ?? "" },
              { header:"Supervisor", accessor:(r:any)=>r.supervisors?.name ?? "" },
              { header:"Qty", accessor:(r:any)=>r.quantity },
              { header:"Meters", accessor:(r:any)=>r.total_meter_consumed },
            ]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New entry</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Book production</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Product</Label>
                  <div className="flex gap-2">
                    <Select value={f.product_id} onValueChange={(v)=>{ if(v==="__other__"){ setNewProdOpen(true); } else setF({...f, product_id:v}); }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select product"/></SelectTrigger>
                      <SelectContent>
                        {(products ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        <SelectItem value="__other__">+ Other (add new)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={()=>setNewProdOpen(true)} title="Add new product"><PlusCircle className="size-4"/></Button>
                  </div>
                  {newProdOpen && (
                    <div className="mt-2 flex gap-2 rounded-md border p-2 bg-muted/40">
                      <Input autoFocus placeholder="New product name" value={newProdName} onChange={(e)=>setNewProdName(e.target.value)} />
                      <Button size="sm" onClick={()=>addProduct.mutate()} disabled={addProduct.isPending || !newProdName.trim()}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={()=>{ setNewProdOpen(false); setNewProdName(""); }}>Cancel</Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Department</Label>
                    <Select value={f.department_id} onValueChange={(v)=>setF({...f, department_id:v, supervisor_id:""})}>
                      <SelectTrigger><SelectValue placeholder="Department"/></SelectTrigger>
                      <SelectContent>{(departments ?? []).map((d:any)=> <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Supervisor</Label>
                    <Select value={f.supervisor_id} onValueChange={(v)=>setF({...f, supervisor_id:v})} disabled={!f.department_id}>
                      <SelectTrigger><SelectValue placeholder={f.department_id ? "Supervisor" : "Pick department first"}/></SelectTrigger>
                      <SelectContent>{filteredSupervisors.map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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
                {product && (!preview || preview.length === 0) && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-2 text-xs text-amber-900 dark:text-amber-200">
                    No BOM defined for this product yet. Add materials from Products → BOM.
                  </div>
                )}
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.product_id || !f.department_id || f.quantity<=0 || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        } />
      <PageBody>
        <EntryListView
          storageKey="entry-view"
          tableName="production_entries"
          searchPlaceholder="Search by product, plant, dept, remarks…"
          detailTitle="Production entry"
          rows={data ?? undefined}
          columns={[
            { header:"Product", cell:(r:any)=> r.products ? `${r.products.code} — ${r.products.name}` : "—" },
            { header:"Date", cell:(r:any)=> fmtDate(r.entry_date) },
            { header:"Dept", cell:(r:any)=> r.departments?.code ?? "—" },
            { header:"Supervisor", cell:(r:any)=> r.supervisors?.name ?? <Badge variant="outline">—</Badge> },
            { header:"Qty", cell:(r:any)=> fmtNum(r.quantity) },
            { header:"Meters", cell:(r:any)=> fmtNum(r.total_meter_consumed,3) },
          ]}
          details={[
            { label:"Product", value:(r:any)=> r.products ? `${r.products.code} — ${r.products.name}` : "—", full:true },
            { label:"Date", value:(r:any)=> fmtDate(r.entry_date) },
            { label:"Department", value:(r:any)=> r.departments?.code ?? "—" },
            { label:"Supervisor", value:(r:any)=> r.supervisors?.name ?? "—" },
            { label:"Quantity", value:(r:any)=> fmtNum(r.quantity) },
            { label:"Total meters consumed", value:(r:any)=> fmtNum(r.total_meter_consumed,3) },
            { label:"Remarks", value:(r:any)=> r.remarks || "—", full:true },
          ]}
        />
      </PageBody>
    </>
  );
}