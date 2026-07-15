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
import { EntryListView } from "@/components/entry-list-view";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate } from "@/lib/format";
import { ExportMenu } from "@/components/export-menu";

export const Route = createFileRoute("/_authenticated/purchase")({ component: Page });

async function ensureDirectSupplier() {
  const { data: existing } = await supabase.from("suppliers").select("id").eq("code","DIRECT").maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await supabase.from("suppliers").insert({
    code: "DIRECT", name: "Direct Purchase", status: "active",
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

function Page() {
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey:["purchase"], queryFn: async () =>
    (await supabase.from("purchase_orders").select("*, materials(code,name,unit,pipe_sizes(size_label))").order("po_date",{ascending:false}).limit(200)).data });
  const { data: materials } = useQuery({ queryKey:["mat-lite-po"], queryFn: async () => (await supabase.from("materials").select("id,code,name,unit,pipe_sizes(size_label)").eq("status","active").order("name")).data });
  const { data: plants } = useQuery({ queryKey:["plants-lite-po"], queryFn: async () => (await supabase.from("plants").select("id,code,name").eq("status","active")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ po_date:new Date().toISOString().slice(0,10), material_id:"", quantity:0, remarks:"" });

  const create = useMutation({
    mutationFn: async () => {
      const plant_id = (plants ?? [])[0]?.id;
      if (!plant_id) throw new Error("No plant configured");
      const supplier_id = await ensureDirectSupplier();
      const { error } = await supabase.from("purchase_orders").insert({
        po_date: f.po_date, material_id: f.material_id, plant_id, supplier_id,
        quantity: f.quantity, received_qty: f.quantity, rate: 0, gst_pct: 0, transport: 0,
        remarks: f.remarks, status: "approved",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Purchase booked — stock updated"); setOpen(false);
      setF({ po_date:new Date().toISOString().slice(0,10), material_id:"", quantity:0, remarks:"" });
      qc.invalidateQueries({queryKey:["purchase"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  const matLabel = (m:any) => {
    const size = m?.pipe_sizes?.size_label;
    return [m?.name, size, m?.unit].filter(Boolean).join(" · ");
  };

  return (
    <>
      <PageHeader title="Purchase" subtitle="Record incoming stock — increases inventory automatically"
        actions={
          <div className="flex items-center gap-2">
          <ExportMenu filename="purchase_orders" title="Purchase Orders"
            rows={data ?? []}
            columns={[
              { header:"Date", accessor:(r:any)=>r.po_date },
              { header:"Material", accessor:(r:any)=> r.materials ? `${r.materials.code} ${r.materials.name}` : "" },
              { header:"Size", accessor:(r:any)=> r.materials?.pipe_sizes?.size_label ?? "" },
              { header:"Unit", accessor:(r:any)=> r.materials?.unit ?? "" },
              { header:"Qty", accessor:(r:any)=>r.quantity },
              { header:"Remarks", accessor:(r:any)=>r.remarks ?? "" },
            ]} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New purchase</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New purchase entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Purchase Date</Label><Input type="date" value={f.po_date} onChange={(e)=>setF({...f, po_date:e.target.value})}/></div>
                <div><Label>Material</Label>
                  <Select value={f.material_id} onValueChange={(v)=>setF({...f, material_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select material"/></SelectTrigger>
                    <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{matLabel(m)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity Purchased</Label><Input type="number" value={f.quantity} onChange={(e)=>setF({...f, quantity:Number(e.target.value)})}/></div>
                <div><Label>Remarks</Label><Textarea rows={2} value={f.remarks} onChange={(e)=>setF({...f, remarks:e.target.value})}/></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.material_id || f.quantity<=0 || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        } />
      <PageBody>
        <EntryListView
          storageKey="entry-view"
          tableName="purchase_orders"
          searchPlaceholder="Search by material, remarks…"
          detailTitle="Purchase entry"
          rows={data ?? undefined}
          columns={[
            { header:"Date", cell:(r:any)=> fmtDate(r.po_date) },
            { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
            { header:"Size", cell:(r:any)=> r.materials?.pipe_sizes?.size_label ?? "—" },
            { header:"Unit", cell:(r:any)=> r.materials?.unit ?? "—" },
            { header:"Qty", cell:(r:any)=> fmtNum(r.quantity) },
            { header:"Remarks", cell:(r:any)=> r.remarks ?? "—" },
          ]}
          details={[
            { label:"Purchase date", value:(r:any)=> fmtDate(r.po_date) },
            { label:"Material", value:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—", full:true },
            { label:"Size", value:(r:any)=> r.materials?.pipe_sizes?.size_label ?? "—" },
            { label:"Unit", value:(r:any)=> r.materials?.unit ?? "—" },
            { label:"Quantity", value:(r:any)=> fmtNum(r.quantity) },
            { label:"Remarks", value:(r:any)=> r.remarks || "—", full:true },
          ]}
        />
      </PageBody>
    </>
  );
}