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
import { Badge } from "@/components/ui/badge";
import { MasterRowActions } from "@/components/master-row-actions";

export const Route = createFileRoute("/_authenticated/masters/suppliers")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("code")).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", gstin: "", contact: "", email: "", address: "" });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("suppliers").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Supplier saved"); setOpen(false); setForm({ code:"",name:"",gstin:"",contact:"",email:"",address:"" }); qc.invalidateQueries({queryKey:["suppliers"]}); },
    onError: (e:any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Vendor master used by purchase orders"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={form.code} onChange={(e)=>setForm({...form, code:e.target.value.toUpperCase()})} /></div>
                  <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e)=>setForm({...form, gstin:e.target.value})} /></div>
                </div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact</Label><Input value={form.contact} onChange={(e)=>setForm({...form, contact:e.target.value})} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={(e)=>setForm({...form, address:e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.code || !form.name || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"Name", cell:(r:any)=> r.name },
          { header:"GSTIN", cell:(r:any)=> r.gstin ?? "—" },
          { header:"Contact", cell:(r:any)=> r.contact ?? "—" },
          { header:"Status", cell:(r:any)=> <Badge variant={r.status==="active"?"default":"secondary"}>{r.status}</Badge> },
          { header:"", className:"text-right w-32", cell:(r:any)=> <MasterRowActions table="suppliers" row={r} queryKey={["suppliers"]} label="supplier" fields={[
            { name:"code", label:"Code", uppercase:true },
            { name:"name", label:"Name" },
            { name:"gstin", label:"GSTIN" },
            { name:"contact", label:"Contact" },
            { name:"email", label:"Email", type:"email" },
            { name:"address", label:"Address" },
          ]} /> },
        ]} />
      </PageBody>
    </>
  );
}