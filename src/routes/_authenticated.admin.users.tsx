import { createFileRoute } from "@tanstack/react-router";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/data-table";
import { toast } from "sonner";
import { Plus, Shield, Trash2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { createUser, setUserRole, deleteUser } from "@/lib/users.functions";
import { adminSendOtpSmtp } from "@/lib/smtp-otp.functions";

const ROLES = ["super_admin","purchase","store","fabrication","innovation_head"] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({ component: Page });

function Page() {
  const { hasAny } = useAuth();
  if (!hasAny(["super_admin"])) {
    return (
      <PageBody>
        <div className="rounded-md border bg-card p-8 text-center">
          <Shield className="size-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">Super-admin only</div>
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
  const del = useServerFn(deleteUser);
  const sendOtp = useServerFn(adminSendOtpSmtp);

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id,email,full_name,created_at").order("created_at",{ascending:false})).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("user_id,role")).data ?? [],
  });
  const rolesByUser = new Map<string,string>();
  (roles ?? []).forEach((r:any)=> rolesByUser.set(r.user_id, r.role));

  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email:"", full_name:"", role:"innovation_head" as any });

  const mCreate = useMutation({
    mutationFn: async () => create({ data: f }),
    onSuccess: async () => {
      try { await sendOtp({ data: { email: f.email } }); toast.success(`User created — OTP sent to ${f.email}`); }
      catch (e:any) { toast.warning(`User created; OTP failed: ${e.message}`); }
      setOpen(false); setF({ email:"", full_name:"", role:"innovation_head" });
      qc.invalidateQueries({ queryKey:["admin-profiles"] });
      qc.invalidateQueries({ queryKey:["admin-roles"] });
    },
    onError: (e:any) => toast.error(e.message),
  });
  const mOtp = useMutation({ mutationFn: async (email:string) => sendOtp({ data: { email } }) as any, onSuccess: (_r:any, email) => toast.success(`OTP sent to ${email}`), onError: (e:any) => toast.error(e.message) });
  const mRole = useMutation({ mutationFn: async (v:{user_id:string; role:string}) => setRole({ data: v as any }), onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey:["admin-roles"] }); }, onError:(e:any)=>toast.error(e.message) });
  const mDel = useMutation({ mutationFn: async (user_id:string) => del({ data: { user_id } }), onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey:["admin-profiles"] }); }, onError:(e:any)=>toast.error(e.message) });

  return (
    <>
      <PageHeader title="User Management" subtitle="Super-admin only"
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
                <div><Label>Role</Label>
                  <Select value={f.role} onValueChange={(v:any)=>setF({...f, role:v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{ROLES.map(r=> <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">No password needed — the user signs in with a one-time code sent to email.</p>
              </div>
              <DialogFooter><Button onClick={()=>mCreate.mutate()} disabled={!f.email || mCreate.isPending}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={profiles ?? undefined} columns={[
          { header:"User", cell:(r:any)=>(<div><div className="font-medium">{r.full_name || "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></div>) },
          { header:"Role", cell:(r:any)=>(
            <Select value={rolesByUser.get(r.id) ?? "innovation_head"} onValueChange={(v)=>mRole.mutate({user_id:r.id, role:v})}>
              <SelectTrigger className="h-8 w-44"><SelectValue/></SelectTrigger>
              <SelectContent>{ROLES.map(rl=> <SelectItem key={rl} value={rl}>{rl}</SelectItem>)}</SelectContent>
            </Select>
          ) },
          { header:"", cell:(r:any)=>(
            <div className="flex items-center justify-end gap-1">
              <Button size="sm" variant="outline" onClick={()=>mOtp.mutate(r.email)}><Send className="size-3.5 mr-1"/>Send OTP</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="size-4 text-destructive"/></Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete user?</AlertDialogTitle><AlertDialogDescription>Deletes <span className="font-medium">{r.email}</span>. Cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={()=>mDel.mutate(r.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) },
        ]} />
      </PageBody>
    </>
  );
}
