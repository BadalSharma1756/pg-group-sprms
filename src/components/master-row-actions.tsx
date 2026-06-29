import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "email";
  step?: string;
  uppercase?: boolean;
};

export function MasterRowActions({
  table, row, fields, queryKey, label = "record",
}: {
  table: string;
  row: any;
  fields: FieldDef[];
  queryKey: any[];
  label?: string;
}) {
  const { hasAny } = useAuth();
  const canEdit = hasAny(["super_admin", "plant_admin"]);
  const canDelete = hasAny(["super_admin"]);
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const initial = Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? ""]));
  const [form, setForm] = useState<any>(initial);

  const update = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form };
      fields.forEach((f) => { if (f.type === "number") payload[f.name] = Number(payload[f.name] ?? 0); });
      const { error } = await supabase.from(table as any).update(payload).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${label} updated`); setEditOpen(false); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table as any).delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${label} deleted`); setDelOpen(false); qc.invalidateQueries({ queryKey }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!canEdit && !canDelete) return null;
  return (
    <div className="flex items-center gap-1 justify-end">
      {canEdit && (
        <Button size="icon" variant="ghost" className="size-8" onClick={() => { setForm(initial); setEditOpen(true); }}>
          <Pencil className="size-3.5" />
        </Button>
      )}
      {canDelete && (
        <Button size="icon" variant="ghost" className="size-8 text-destructive hover:text-destructive" onClick={() => setDelOpen(true)}>
          <Trash2 className="size-3.5" />
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {label}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name}>
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? "text"}
                  step={f.step}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.name]: f.uppercase ? e.target.value.toUpperCase() : e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={() => update.mutate()} disabled={update.isPending}>Save changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the record. Related transactions may be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => del.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}