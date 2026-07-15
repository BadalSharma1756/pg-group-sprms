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
import { Badge } from "@/components/ui/badge";
import { MasterRowActions } from "@/components/master-row-actions";

export const Route = createFileRoute("/_authenticated/masters/supervisors")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["supervisors"], queryFn: async () =>
    (await supabase.from("supervisors").select("*, departments(code,name)").order("name")).data });
  const { data: departments } = useQuery({ queryKey: ["dept-lite-sup"], queryFn: async () =>
    (await supabase.from("departments").select("id,code,name").eq("status","active").order("name")).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", phone: "" });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("supervisors").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm({ name: "", department_id: "", phone: "" }); qc.invalidateQueries({ queryKey: ["supervisors"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Supervisors" subtitle="People responsible for production in each department"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New supervisor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New supervisor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} /></div>
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v)=>setForm({...form, department_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>{(departments ?? []).map((d:any)=> <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.name || !form.department_id || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header: "Name", cell: (r:any) => r.name },
          { header: "Department", cell: (r:any) => r.departments ? `${r.departments.name}` : "—" },
          { header: "Phone", cell: (r:any) => r.phone ?? "—" },
          { header: "Status", cell: (r:any) => <Badge variant={r.status==="active"?"default":"secondary"}>{r.status}</Badge> },
          { header: "", className: "text-right w-32", cell: (r:any) => <MasterRowActions table="supervisors" row={r} queryKey={["supervisors"]} label="supervisor" fields={[
            { name:"name", label:"Name" },
            { name:"phone", label:"Phone" },
            { name:"status", label:"Status" },
          ]} /> },
        ]} />
      </PageBody>
    </>
  );
}