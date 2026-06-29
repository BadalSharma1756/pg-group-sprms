import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Shield, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createUser, setUserRole, setUserPlants, deleteUser } from "@/lib/users.functions";

const ROLES = [
  "super_admin","plant_admin","production_manager","production_operator",
  "purchase_manager","purchase_executive","store_manager",
  "quality_manager","auditor","viewer",
] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({ component: Page });

function Page() {
  const { hasAny } = useAuth();
  if (!hasAny(["super_admin"])) {
    return (
      <PageBody>
        <div className="rounded-md border bg-card p-8 text-center">
          <Shield className="size-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">Super-admin only</div>
          <div className="text-sm text-muted-foreground">You need super_admin role to manage users.</div>
        </div>
      </PageBody>
    );
  }
  return <Inner />;
}

function Inner() {
  const qc = useQueryClient();
  const create = useServerFn(createUser);
  const setRole = useServerFn(setUserRole);
  const setPlants = useServerFn(setUserPlants);
  const del = useServerFn(deleteUser);

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,email,full_name,created_at").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id,role")).data ?? [],
  });
  const { data: plants } = useQuery({
    queryKey: ["admin-plants"],
    queryFn: async () => (await supabase.from("plants").select("id,code,name").order("code")).data ?? [],
  });
  const { data: userPlants } = useQuery({
    queryKey: ["admin-user-plants"],
    queryFn: async () => (await supabase.from("user_plants").select("user_id,plant_id")).data ?? [],
  });

  const rolesByUser = new Map<string,string>();
  (roles ?? []).forEach((r:any)=> rolesByUser.set(r.user_id, r.role));
  const plantsByUser = new Map<string,string[]>();
  (userPlants ?? []).forEach((r:any)=> {
    const a = plantsByUser.get(r.user_id) ?? [];
    a.push(r.plant_id); plantsByUser.set(r.user_id, a);
  });

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email:"", password:"", full_name:"", role:"viewer", plant_ids:[] as string[] });

  const mCreate = useMutation({
    mutationFn: async () => create({ data: f }),
    onSuccess: () => {
      toast.success(`User created — ${f.email}`);
      setOpen(false);
      setF({ email:"", password:"", full_name:"", role:"viewer", plant_ids:[] });
      qc.invalidateQueries({ queryKey:["admin-profiles"] });
      qc.invalidateQueries({ queryKey:["admin-roles"] });
      qc.invalidateQueries({ queryKey:["admin-user-plants"] });
    },
    onError: (e:any) => toast.error(e.message),
  });

  const mRole = useMutation({
    mutationFn: async (v:{user_id:string; role:string}) => setRole({ data: v as any }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey:["admin-roles"] }); },
    onError: (e:any) => toast.error(e.message),
  });
  const mPlants = useMutation({
    mutationFn: async (v:{user_id:string; plant_ids:string[]}) => setPlants({ data: v }),
    onSuccess: () => { toast.success("Plant access updated"); qc.invalidateQueries({ queryKey:["admin-user-plants"] }); },
    onError: (e:any) => toast.error(e.message),
  });
  const mDel = useMutation({
    mutationFn: async (user_id:string) => del({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey:["admin-profiles"] });
      qc.invalidateQueries({ queryKey:["admin-roles"] });
    },
    onError: (e:any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="User Management" subtitle="Create users, assign roles and plant access (super-admin only)"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New user</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e)=>setF({...f, email:e.target.value})}/></div>
                  <div><Label>Full name</Label><Input value={f.full_name} onChange={(e)=>setF({...f, full_name:e.target.value})}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Password</Label><Input type="text" value={f.password} onChange={(e)=>setF({...f, password:e.target.value})} placeholder="min 8 chars"/></div>
                  <div><Label>Role</Label>
                    <Select value={f.role} onValueChange={(v)=>setF({...f, role:v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{ROLES.map(r=> <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Plant access (leave empty = all, for admin roles)</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-auto rounded-md border p-3">
                    {(plants ?? []).map((p:any)=>(
                      <label key={p.id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={f.plant_ids.includes(p.id)} onCheckedChange={(c)=>{
                          setF((s)=>({...s, plant_ids: c ? [...s.plant_ids, p.id] : s.plant_ids.filter(x=>x!==p.id)}));
                        }} />
                        {p.code} — {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={()=>mCreate.mutate()} disabled={!f.email || f.password.length<8 || mCreate.isPending}>Create user</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={profiles ?? undefined} columns={[
          { header:"User", cell:(r:any)=>(<div><div className="font-medium">{r.full_name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></div>) },
          { header:"Role", cell:(r:any)=>(
            <Select value={rolesByUser.get(r.id) ?? "viewer"} onValueChange={(v)=>mRole.mutate({user_id:r.id, role:v})}>
              <SelectTrigger className="h-8 w-44"><SelectValue/></SelectTrigger>
              <SelectContent>{ROLES.map(rl=> <SelectItem key={rl} value={rl}>{rl}</SelectItem>)}</SelectContent>
            </Select>
          ) },
          { header:"Plant access", cell:(r:any)=> <PlantPicker plants={plants ?? []} selected={plantsByUser.get(r.id) ?? []} onSave={(ids)=>mPlants.mutate({user_id:r.id, plant_ids:ids})} /> },
          { header:"", cell:(r:any)=>(
            <Button size="sm" variant="ghost" onClick={()=>{ if (confirm(`Delete ${r.email}?`)) mDel.mutate(r.id); }}>
              <Trash2 className="size-4 text-destructive"/>
            </Button>
          ) },
        ]} />
      </PageBody>
    </>
  );
}

function PlantPicker({ plants, selected, onSave }:{ plants:any[]; selected:string[]; onSave:(ids:string[])=>void }) {
  const [open,setOpen] = useState(false);
  const [local,setLocal] = useState<string[]>(selected);
  const summary = selected.length === 0 ? "All plants (admin)" : `${selected.length} plant(s)`;
  return (
    <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if (o) setLocal(selected); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Badge variant="secondary" className="mr-2">{selected.length}</Badge>{summary}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign plants</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto">
          {plants.map((p)=>(
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.includes(p.id)} onCheckedChange={(c)=>{
                setLocal((s)=> c ? [...s, p.id] : s.filter(x=>x!==p.id));
              }} />
              {p.code} — {p.name}
            </label>
          ))}
        </div>
        <DialogFooter><Button onClick={()=>{ onSave(local); setOpen(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}