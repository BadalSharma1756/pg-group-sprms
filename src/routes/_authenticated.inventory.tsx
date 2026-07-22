import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sliders } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data: stock } = useQuery({ queryKey:["stock"], queryFn: async () =>
    (await supabase.from("v_current_stock").select("*").order("code")).data });
  const { data: txns } = useQuery({ queryKey:["txns"], queryFn: async () =>
    (await supabase.from("inventory_transactions").select("*, materials(code,name)").order("txn_date",{ascending:false}).limit(300)).data });
  const { data: materials } = useQuery({ queryKey:["mat-lite-inv"], queryFn: async () => (await supabase.from("materials").select("id,code,name")).data });

  const [open, setOpen] = useState(false);
  const [a, setA] = useState({ material_id: "", direction: "in" as "in" | "out", quantity: 0, remarks: "" });
  const adjust = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_transactions").insert({
        material_id: a.material_id,
        txn_type: "adjustment",
        qty_in: a.direction === "in" ? a.quantity : 0,
        qty_out: a.direction === "out" ? a.quantity : 0,
        remarks: `Manual adjustment: ${a.remarks || "—"}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adjustment posted");
      setOpen(false);
      setA({ material_id: "", direction: "in", quantity: 0, remarks: "" });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["txns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Inventory" subtitle="Real-time stock from the transaction ledger"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="outline"><Sliders className="size-4 mr-1"/>Manual adjustment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Inventory adjustment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Material</Label>
                  <Select value={a.material_id} onValueChange={(v)=>setA({...a, material_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
                    <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Direction</Label>
                    <Select value={a.direction} onValueChange={(v:any)=>setA({...a, direction:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">IN (+ add stock)</SelectItem>
                        <SelectItem value="out">OUT (− reduce stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantity</Label><Input type="number" step="0.001" value={a.quantity} onChange={(e)=>setA({...a, quantity:Number(e.target.value)})}/></div>
                </div>
                <div><Label>Reason</Label><Textarea value={a.remarks} onChange={(e)=>setA({...a, remarks:e.target.value})}/></div>
              </div>
              <DialogFooter><Button onClick={()=>adjust.mutate()} disabled={!a.material_id || a.quantity<=0 || adjust.isPending}>Post</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <Tabs defaultValue="stock">
          <TabsList><TabsTrigger value="stock">Current Stock</TabsTrigger><TabsTrigger value="ledger">Ledger</TabsTrigger></TabsList>
          <TabsContent value="stock" className="mt-4">
            <DataTable rows={(stock ?? []).map((r:any)=>({ id:r.material_id, ...r }))} columns={[
              { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
              { header:"Material", cell:(r:any)=> r.name },
              { header:"UOM", cell:(r:any)=> r.uom },
              { header:"Current stock", cell:(r:any)=> <span className={Number(r.current_stock)<=0?"text-destructive font-semibold":"font-semibold"}>{fmtNum(r.current_stock,3)}</span> },
              { header:"Reorder", cell:(r:any)=> fmtNum(r.reorder_level) },
              { header:"Status", cell:(r:any)=> Number(r.current_stock) <= Number(r.reorder_level) && Number(r.reorder_level)>0 ? <Badge variant="destructive">Low</Badge> : <Badge>OK</Badge> },
            ]} empty="No stock records yet" />
          </TabsContent>
          <TabsContent value="ledger" className="mt-4">
            <DataTable rows={txns ?? undefined} columns={[
              { header:"When", cell:(r:any)=> fmtDateTime(r.txn_date) },
              { header:"Type", cell:(r:any)=> <Badge variant="outline" className="capitalize">{r.txn_type}</Badge> },
              { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
              { header:"In", cell:(r:any)=> fmtNum(r.qty_in,3) },
              { header:"Out", cell:(r:any)=> fmtNum(r.qty_out,3) },
              { header:"Remarks", cell:(r:any)=> r.remarks ?? "" },
            ]} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
