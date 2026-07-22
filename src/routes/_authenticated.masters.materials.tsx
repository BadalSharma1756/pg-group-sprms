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
  const { data } = useQuery({ queryKey:["materials"], queryFn: async () => (await supabase.from("materials").select("*").order("code")).data });
  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ name:"", description:"", category:"", uom:"PCS" as "PCS"|"MTR"|"SET", min_stock:0, reorder_level:0 });
  const create=useMutation({
    mutationFn: async () => { const { error } = await supabase.from("materials").insert({ code:"", ...f }); if (error) throw error; },
    onSuccess: () => { toast.success("Material saved — code auto-generated"); setOpen(false); setF({ name:"",description:"",category:"",uom:"PCS",min_stock:0,reorder_level:0 }); qc.invalidateQueries({queryKey:["materials"]}); },
    onError:(e:any)=>toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Material Master" subtitle="All raw materials — code auto-generated (MAT-xxxxx)"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New material</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New material</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={f.name} onChange={(e)=>setF({...f, name:e.target.value})}/></div>
                <div><Label>Description</Label><Input value={f.description} onChange={(e)=>setF({...f, description:e.target.value})}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label><Input value={f.category} onChange={(e)=>setF({...f, category:e.target.value})}/></div>
                  <div><Label>UOM</Label>
                    <Select value={f.uom} onValueChange={(v:any)=>setF({...f, uom:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="PCS">PCS</SelectItem><SelectItem value="MTR">MTR</SelectItem><SelectItem value="SET">SET</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Min stock</Label><Input type="number" step="0.001" value={f.min_stock} onChange={(e)=>setF({...f, min_stock:Number(e.target.value)})}/></div>
                  <div><Label>Reorder level</Label><Input type="number" step="0.001" value={f.reorder_level} onChange={(e)=>setF({...f, reorder_level:Number(e.target.value)})}/></div>
                </div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.name || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"Name", cell:(r:any)=> r.name },
          { header:"Category", cell:(r:any)=> r.category ?? "—" },
          { header:"UOM", cell:(r:any)=> r.uom },
          { header:"Min stock", cell:(r:any)=> fmtNum(r.min_stock) },
          { header:"Reorder", cell:(r:any)=> fmtNum(r.reorder_level) },
        ]} />
      </PageBody>
    </>
  );
}
