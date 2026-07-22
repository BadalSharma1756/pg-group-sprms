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

export const Route = createFileRoute("/_authenticated/masters/departments")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["departments"], queryFn: async () => (await supabase.from("departments").select("*").order("code")).data });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("departments").insert(form); if (error) throw error; },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm({ code: "", name: "" }); qc.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <>
      <PageHeader title="Departments" subtitle="Operational units"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />New department</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New department</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Code</Label><Input value={form.code} onChange={(e)=>setForm({...form, code: e.target.value.toUpperCase()})} /></div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!form.code || !form.name || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header: "Code", cell: (r:any) => <span className="font-mono text-xs">{r.code}</span> },
          { header: "Name", cell: (r:any) => r.name },
          { header: "Status", cell: (r:any) => <Badge variant={r.status==="active"?"default":"secondary"}>{r.status}</Badge> },
        ]} />
      </PageBody>
    </>
  );
}
