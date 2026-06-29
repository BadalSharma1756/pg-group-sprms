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
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/masters/products")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*, plants(code), departments(code,name), pipe_sizes(code), materials(code,name)").order("code")).data,
  });
  const { data: plants } = useQuery({ queryKey:["plants-lite-p"], queryFn: async () => (await supabase.from("plants").select("id,code,name")).data });
  const { data: depts } = useQuery({ queryKey:["dept-lite"], queryFn: async () => (await supabase.from("departments").select("id,code,name,plant_id")).data });
  const { data: sizes } = useQuery({ queryKey:["pipe-lite-p"], queryFn: async () => (await supabase.from("pipe_sizes").select("id,code")).data });
  const { data: mats } = useQuery({ queryKey:["mat-lite-p"], queryFn: async () => (await supabase.from("materials").select("id,code,name")).data });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    code:"", name:"", category:"", plant_id:"", department_id:"", pipe_size_id:"", material_id:"",
    length_mm:0, width_mm:0, height_mm:0,
  });
  const preview = useMemo(()=>{
    const L=f.length_mm/1000, W=f.width_mm/1000, H=f.height_mm/1000;
    const m = 2*(L+W) + 4*H;
    return { meter: m, feet: m*3.28084, p4: m/4, p6: m/6 };
  }, [f.length_mm, f.width_mm, f.height_mm]);

  const filteredDepts = (depts ?? []).filter((d:any)=> !f.plant_id || d.plant_id===f.plant_id);

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("products").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Product saved — calculations done by database trigger"); setOpen(false);
      setF({ code:"",name:"",category:"",plant_id:"",department_id:"",pipe_size_id:"",material_id:"",length_mm:0,width_mm:0,height_mm:0 });
      qc.invalidateQueries({queryKey:["products"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Products" subtitle="Finished goods — pipe requirements are auto-calculated from dimensions"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New product</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Code</Label><Input value={f.code} onChange={(e)=>setF({...f, code:e.target.value.toUpperCase()})}/></div>
                  <div className="col-span-2"><Label>Name</Label><Input value={f.name} onChange={(e)=>setF({...f, name:e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label><Input value={f.category} onChange={(e)=>setF({...f, category:e.target.value})}/></div>
                  <div><Label>Plant</Label>
                    <Select value={f.plant_id} onValueChange={(v)=>setF({...f, plant_id:v, department_id:""})}>
                      <SelectTrigger><SelectValue placeholder="Plant"/></SelectTrigger>
                      <SelectContent>{(plants ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Department</Label>
                    <Select value={f.department_id} onValueChange={(v)=>setF({...f, department_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Dept"/></SelectTrigger>
                      <SelectContent>{filteredDepts.map((d:any)=> <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Pipe size</Label>
                    <Select value={f.pipe_size_id} onValueChange={(v)=>setF({...f, pipe_size_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Pipe size"/></SelectTrigger>
                      <SelectContent>{(sizes ?? []).map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Material</Label>
                    <Select value={f.material_id} onValueChange={(v)=>setF({...f, material_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
                      <SelectContent>{(mats ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Length (mm)</Label><Input type="number" value={f.length_mm} onChange={(e)=>setF({...f, length_mm:Number(e.target.value)})}/></div>
                  <div><Label>Width (mm)</Label><Input type="number" value={f.width_mm} onChange={(e)=>setF({...f, width_mm:Number(e.target.value)})}/></div>
                  <div><Label>Height (mm)</Label><Input type="number" value={f.height_mm} onChange={(e)=>setF({...f, height_mm:Number(e.target.value)})}/></div>
                </div>
                <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-medium text-foreground"><Calculator className="size-4 text-primary"/>Auto-calculated (database trigger)</div>
                  <div className="grid grid-cols-4 gap-2 mt-2 tabular-nums">
                    <div><div className="text-muted-foreground">Total meter</div><div className="font-semibold">{fmtNum(preview.meter,4)}</div></div>
                    <div><div className="text-muted-foreground">Total feet</div><div className="font-semibold">{fmtNum(preview.feet,4)}</div></div>
                    <div><div className="text-muted-foreground">4 m pipes</div><div className="font-semibold">{fmtNum(preview.p4,4)}</div></div>
                    <div><div className="text-muted-foreground">6 m pipes</div><div className="font-semibold">{fmtNum(preview.p6,4)}</div></div>
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.code || !f.name || !f.plant_id || !f.department_id || !f.pipe_size_id || !f.material_id || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"Name", cell:(r:any)=> r.name },
          { header:"Plant / Dept", cell:(r:any)=> `${r.plants?.code ?? "—"} / ${r.departments?.code ?? "—"}` },
          { header:"Pipe", cell:(r:any)=> r.pipe_sizes?.code ?? "—" },
          { header:"L×W×H (mm)", cell:(r:any)=> `${fmtNum(r.length_mm,0)}×${fmtNum(r.width_mm,0)}×${fmtNum(r.height_mm,0)}` },
          { header:"Total m", cell:(r:any)=> fmtNum(r.total_meter,3) },
          { header:"4 m pipes", cell:(r:any)=> fmtNum(r.pipes_required_4m,3) },
          { header:"6 m pipes", cell:(r:any)=> fmtNum(r.pipes_required_6m,3) },
        ]} />
      </PageBody>
    </>
  );
}