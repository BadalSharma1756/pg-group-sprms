import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLE_VALUES = [
  "super_admin","plant_admin",
  "purchase","store","fabrication","innovation_head",
  "production_manager","production_operator",
  "purchase_manager","purchase_executive","store_manager",
  "quality_manager","auditor","viewer",
] as const;

const CreateInput = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  role: z.enum(ROLE_VALUES),
});

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  const ok = (data ?? []).some((r: any) => r.role === "super_admin");
  if (!ok) throw new Error("Only super_admin can manage users");
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Passwordless: generate a random unguessable password the user never sees.
    // Users sign in via email OTP (one-time code) — no password needed.
    const randomPassword =
      crypto.randomUUID() + "-" + crypto.randomUUID().toUpperCase() + "!aZ9";
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: data.full_name ?? "" },
    });
    if (created.error) throw new Error(created.error.message);
    const uid = created.data.user!.id;
    // remove the default 'viewer' inserted by handle_new_user trigger, set desired role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const ins = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    if (ins.error) throw new Error(ins.error.message);
    return { ok: true, user_id: uid };
  });

const RoleInput = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ROLE_VALUES),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RoleInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteInput = z.object({ user_id: z.string().uuid() });
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => DeleteInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });