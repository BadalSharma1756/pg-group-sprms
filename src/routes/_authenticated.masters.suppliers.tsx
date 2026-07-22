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

export const Route = createFileRoute("/_authenticated/masters/suppliers")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: async () => (await supabase.from("suppliers").select("*").order("code")).data });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ code: "", name: "", gstin: "", contact_name: "", email: "", address: "", phone: "" });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("suppliers").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Supplier saved"); setOpen(false); setF({ code:"",name:"",gstin:"",contact_name:"",email:"",address:"",phone:"" }); qc.invalidateQueries({queryKey:["suppliers"]}); },
    onError: (e:any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Suppliers"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={f.code} onChange={(e)=>setF({...f, code:e.target.value.toUpperCase()})} /></div>
                  <div><Label>GSTIN</Label><Input value={f.gstin} onChange={(e)=>setF({...f, gstin:e.target.value})} /></div>
                </div>
                <div><Label>Name</Label><Input value={f.name} onChange={(e)=>setF({...f, name:e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contact</Label><Input value={f.contact_name} onChange={(e)=>setF({...f, contact_name:e.target.value})} /></div>
                  <div><Label>Phone</Label><Input value={f.phone} onChange={(e)=>setF({...f, phone:e.target.value})} /></div>
                </div>
                <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e)=>setF({...f, email:e.target.value})} /></div>
                <div><Label>Address</Label><Input value={f.address} onChange={(e)=>setF({...f, address:e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.code || !f.name || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Code", cell:(r:any)=> <span className="font-mono text-xs">{r.code}</span> },
          { header:"Name", cell:(r:any)=> r.name },
          { header:"GSTIN", cell:(r:any)=> r.gstin ?? "—" },
          { header:"Contact", cell:(r:any)=> r.contact_name ?? "—" },
          { header:"Status", cell:(r:any)=> <Badge variant={r.status==="active"?"default":"secondary"}>{r.status}</Badge> },
        ]} />
      </PageBody>
    </>
  );
}
