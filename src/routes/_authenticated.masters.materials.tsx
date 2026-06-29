import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/masters/materials")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey:["materials"], queryFn: async () => (await supabase.from("materials").select("*, pipe_sizes(code)").order("code")).data });
  const { data: sizes } = useQuery({ queryKey:["pipe-sizes-lite"], queryFn: async () => (await supabase.from("pipe_sizes").select("id,code")).data });
  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ code:"", name:"", pipe_size_id:"", unit:"meter", reorder_level:0, allowed_wastage_pct:2 });
  const create=useMutation({
    mutationFn: async () => { const { error } = await supabase.from("materials").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setF({ code:"",name:"",pipe_size_id:"",unit:"meter",reorder_level:0,allowed_wastage_pct:2 }); qc.invalidateQueries({queryKey:["materials"]}); },
    onError:(e:any)=>toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Materials" subtitle="Raw materials (SS pipe stock-keeping units)"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New material</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New material</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={f.code} onChange={(e)=>setF({...f, code:e.target.value.toUpperCase()})}/></div>
                  <div><Label>Unit</Label><Input value={f.unit} onChange={(e)=>setF({...f, unit:e.target.value})}/></div>
                </div>
                <div><Label>Name</Label><Input value={f.name} onChange={(e)=>setF({...f, name:e.target.value})}/></div>
                <div><Label>Pipe size</Label>
                  <Select value={f.pipe_size_id} onValueChange={(v)=>setF({...f, pipe_size_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select pipe size"/></SelectTrigger>
                    <SelectContent>{(sizes ?? []).map((s:any)=> <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Reorder level</Label><Input type="number" value={f.reorder_level} onChange={(e)=>setF({...f, reorder_level:Number(e.target.value)})}/></div>
                  <div><Label>Allowed wastage %</Label><Input type="number" step="0.01" value={f.allowed_wastage_pct} onChange={(e)=>setF({...f, allowed_wastage_pct:Number(e.target.value)})}/></div>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.code || !f.name || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"Name", cell:(r:any)=> r.name },
          { header:"Pipe size", cell:(r:any)=> r.pipe_sizes?.code ?? "—" },
          { header:"Unit", cell:(r:any)=> r.unit },
          { header:"Reorder", cell:(r:any)=> fmtNum(r.reorder_level) },
          { header:"Wastage %", cell:(r:any)=> fmtNum(r.allowed_wastage_pct) },
        ]} />
      </PageBody>
    </>
  );
}