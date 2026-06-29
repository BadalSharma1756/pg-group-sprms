import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/masters/pipe-sizes")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey:["pipe-sizes"], queryFn: async () => (await supabase.from("pipe_sizes").select("*").order("code")).data });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: "", outer_diameter_mm: 0, thickness_mm: 0, weight_per_meter_kg: 0 });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("pipe_sizes").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setF({ code:"", outer_diameter_mm:0, thickness_mm:0, weight_per_meter_kg:0 }); qc.invalidateQueries({queryKey:["pipe-sizes"]}); },
    onError: (e:any)=> toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Pipe Sizes" subtitle="Standard SS pipe specifications"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New size</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New pipe size</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Code</Label><Input value={f.code} onChange={(e)=>setF({...f, code:e.target.value.toUpperCase()})} placeholder="e.g. SS-25.4-1.5" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>OD (mm)</Label><Input type="number" step="0.01" value={f.outer_diameter_mm} onChange={(e)=>setF({...f, outer_diameter_mm:Number(e.target.value)})}/></div>
                  <div><Label>Thk (mm)</Label><Input type="number" step="0.01" value={f.thickness_mm} onChange={(e)=>setF({...f, thickness_mm:Number(e.target.value)})}/></div>
                  <div><Label>Wt/m (kg)</Label><Input type="number" step="0.001" value={f.weight_per_meter_kg} onChange={(e)=>setF({...f, weight_per_meter_kg:Number(e.target.value)})}/></div>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.code || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"OD (mm)", cell:(r:any)=> fmtNum(r.outer_diameter_mm,3) },
          { header:"Thickness (mm)", cell:(r:any)=> fmtNum(r.thickness_mm,3) },
          { header:"Weight / m (kg)", cell:(r:any)=> fmtNum(r.weight_per_meter_kg,4) },
        ]} />
      </PageBody>
    </>
  );
}