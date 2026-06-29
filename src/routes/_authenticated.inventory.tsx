import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { fmtNum, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({ component: Page });

function Page() {
  const { data: stock } = useQuery({ queryKey:["stock"], queryFn: async () =>
    (await supabase.from("v_current_stock").select("*").order("material_code")).data });
  const { data: txns } = useQuery({ queryKey:["txns"], queryFn: async () =>
    (await supabase.from("inventory_transactions").select("*, materials(code,name), plants(code)").order("txn_date",{ascending:false}).limit(300)).data });

  return (
    <>
      <PageHeader title="Inventory" subtitle="Real-time stock from the transaction ledger" />
      <PageBody>
        <Tabs defaultValue="stock">
          <TabsList><TabsTrigger value="stock">Current Stock</TabsTrigger><TabsTrigger value="ledger">Ledger</TabsTrigger></TabsList>
          <TabsContent value="stock" className="mt-4">
            <DataTable rows={(stock ?? []).map((r:any,i:number)=>({ id:`${r.material_id}-${r.plant_id}-${i}`, ...r }))} columns={[
              { header:"Material", cell:(r:any)=> `${r.material_code} — ${r.material_name}` },
              { header:"Plant", cell:(r:any)=> r.plant_code },
              { header:"In", cell:(r:any)=> fmtNum(r.total_in,3) },
              { header:"Out", cell:(r:any)=> fmtNum(r.total_out,3) },
              { header:"Stock", cell:(r:any)=> <span className={Number(r.current_stock)<=0?"text-destructive font-semibold":"font-semibold"}>{fmtNum(r.current_stock,3)}</span> },
              { header:"Reorder", cell:(r:any)=> fmtNum(r.reorder_level) },
              { header:"Status", cell:(r:any)=> Number(r.current_stock) <= Number(r.reorder_level)
                ? <Badge variant="destructive">Low</Badge> : <Badge>OK</Badge> },
            ]} empty="No stock records yet" />
          </TabsContent>
          <TabsContent value="ledger" className="mt-4">
            <DataTable rows={txns ?? undefined} columns={[
              { header:"When", cell:(r:any)=> fmtDateTime(r.txn_date) },
              { header:"Type", cell:(r:any)=> <Badge variant="outline" className="capitalize">{r.txn_type.replace("_"," ")}</Badge> },
              { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
              { header:"Plant", cell:(r:any)=> r.plants?.code ?? "—" },
              { header:"In", cell:(r:any)=> fmtNum(r.qty_in,3) },
              { header:"Out", cell:(r:any)=> fmtNum(r.qty_out,3) },
              { header:"Ref", cell:(r:any)=> r.ref_table ?? "—" },
              { header:"Remarks", cell:(r:any)=> r.remarks ?? "" },
            ]} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}