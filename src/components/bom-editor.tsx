import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Lock, Boxes } from "lucide-react";
import { toast } from "sonner";
import { fmtNum } from "@/lib/format";

export function BomEditor({ productId, productName }: { productId: string; productName: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: rows } = useQuery({
    queryKey: ["bom-edit", productId],
    enabled: open,
    queryFn: async () => (await supabase.from("product_bom")
      .select("id, material_id, qty_per_unit, uom, is_auto, materials(code,name)")
      .eq("product_id", productId).order("is_auto", { ascending: false })).data,
  });
  const { data: mats } = useQuery({ queryKey:["mats-all"], enabled: open,
    queryFn: async () => (await supabase.from("materials").select("id,code,name").order("code")).data });

  const [newMat, setNewMat] = useState(""); const [newQty, setNewQty] = useState(0); const [newUom, setNewUom] = useState("pcs");

  const upd = useMutation({
    mutationFn: async ({ id, qty_per_unit, uom }: any) => {
      const { error } = await supabase.from("product_bom").update({ qty_per_unit, uom }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bom-edit", productId] }),
    onError: (e:any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("product_bom").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["bom-edit", productId] }); },
    onError: (e:any) => toast.error(e.message),
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!newMat || newQty <= 0) throw new Error("Pick material and qty");
      const { error } = await supabase.from("product_bom").insert({ product_id: productId, material_id: newMat, qty_per_unit: newQty, uom: newUom });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added"); setNewMat(""); setNewQty(0); setNewUom("pcs"); qc.invalidateQueries({ queryKey: ["bom-edit", productId] }); },
    onError: (e:any) => toast.error(e.message),
  });

  const used = new Set((rows ?? []).map((r:any) => r.material_id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Boxes className="size-4 mr-1"/>BOM</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>BOM — {productName}</DialogTitle></DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">One row per material. Auto Pipe row syncs from product dimensions.</div>
        <div className="rounded border max-h-80 overflow-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-muted/50 text-xs">
              <tr><th className="text-left p-2">Material</th><th className="text-right p-2">Qty / unit</th><th className="text-left p-2">UOM</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r:any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.materials?.code} — {r.materials?.name} {r.is_auto && <Lock className="inline size-3 ml-1 text-muted-foreground"/>}</td>
                  <td className="p-2 text-right">
                    {r.is_auto ? <span className="text-muted-foreground">{fmtNum(r.qty_per_unit,4)}</span> :
                      <Input className="h-7 text-right" type="number" step="0.0001" defaultValue={r.qty_per_unit}
                        onBlur={(e)=>{ const v=Number(e.target.value); if(v!==Number(r.qty_per_unit)) upd.mutate({ id:r.id, qty_per_unit:v, uom:r.uom }); }}/>}
                  </td>
                  <td className="p-2">
                    {r.is_auto ? <span className="text-muted-foreground">{r.uom}</span> :
                      <Input className="h-7 w-20" defaultValue={r.uom} onBlur={(e)=>{ if(e.target.value!==r.uom) upd.mutate({ id:r.id, qty_per_unit:r.qty_per_unit, uom:e.target.value }); }}/>}
                  </td>
                  <td className="p-2 text-right">
                    {!r.is_auto && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={()=>del.mutate(r.id)}><Trash2 className="size-4"/></Button>}
                  </td>
                </tr>
              ))}
              {(rows ?? []).length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No BOM rows</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-12 gap-2 items-end mt-3">
          <div className="col-span-6">
            <div className="text-xs text-muted-foreground mb-1">Add material</div>
            <Select value={newMat} onValueChange={setNewMat}>
              <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
              <SelectContent>{(mats ?? []).filter((m:any)=>!used.has(m.id)).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-3"><div className="text-xs text-muted-foreground mb-1">Qty/unit</div><Input type="number" step="0.0001" value={newQty} onChange={(e)=>setNewQty(Number(e.target.value))}/></div>
          <div className="col-span-2"><div className="text-xs text-muted-foreground mb-1">UOM</div><Input value={newUom} onChange={(e)=>setNewUom(e.target.value)}/></div>
          <div className="col-span-1"><Button size="icon" onClick={()=>add.mutate()} disabled={!newMat || newQty<=0 || add.isPending}><Plus className="size-4"/></Button></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}