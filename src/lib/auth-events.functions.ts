import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOCKOUT_WINDOW_MIN = 15;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MIN = 15;

const LogInput = z.object({
  email: z.string().email(),
  event_type: z.enum(["otp_sent", "otp_verified", "otp_failed", "lockout", "admin_otp_sent", "resend_otp"]),
  success: z.boolean().default(true),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/** Anonymous-callable logger for the public auth page (no middleware). */
export const logAuthEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => LogInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("auth_events").insert({
      email: data.email.toLowerCase(),
      event_type: data.event_type,
      success: data.success,
      message: data.message ?? null,
      metadata: data.metadata ?? {},
    });
    return { ok: true };
  });

const EmailInput = z.object({ email: z.string().email() });

/** Check whether an email is currently locked out. Public — used before sending OTP. */
export const checkLockout = createServerFn({ method: "POST" })
  .inputValidator((d) => EmailInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MIN * 60_000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("auth_events")
      .select("event_type, created_at")
      .eq("email", data.email.toLowerCase())
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);

    // Active lockout if a 'lockout' event exists within LOCKOUT_DURATION_MIN
    const cutoff = Date.now() - LOCKOUT_DURATION_MIN * 60_000;
    const activeLock = (rows ?? []).find(
      (r: any) => r.event_type === "lockout" && new Date(r.created_at).getTime() > cutoff
    );
    if (activeLock) {
      const unlockAt = new Date(new Date(activeLock.created_at).getTime() + LOCKOUT_DURATION_MIN * 60_000);
      return { locked: true, unlock_at: unlockAt.toISOString(), reason: "Too many failed attempts" };
    }

    const failedCount = (rows ?? []).filter((r: any) => r.event_type === "otp_failed").length;
    return { locked: false, failed_count: failedCount, threshold: LOCKOUT_THRESHOLD };
  });

/** Record an OTP failure; if threshold crossed, also insert a lockout event. */
export const recordOtpFailure = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email(), message: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    await supabaseAdmin.from("auth_events").insert({
      email, event_type: "otp_failed", success: false, message: data.message ?? "Invalid OTP",
    });
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("auth_events")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .eq("event_type", "otp_failed")
      .gte("created_at", since);
    if ((count ?? 0) >= LOCKOUT_THRESHOLD) {
      await supabaseAdmin.from("auth_events").insert({
        email, event_type: "lockout", success: false,
        message: `Locked for ${LOCKOUT_DURATION_MIN} min after ${count} failed attempts`,
        metadata: { lockout_minutes: LOCKOUT_DURATION_MIN },
      });
      return { locked: true, failed_count: count, lockout_minutes: LOCKOUT_DURATION_MIN };
    }
    return { locked: false, failed_count: count ?? 0, threshold: LOCKOUT_THRESHOLD };
  });

/** Super-admin: send OTP to user's registered email and report delivery status. */
export const adminSendOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EmailInput.parse(d))
  .handler(async ({ context, data }) => {
    // verify caller is super_admin
    const { data: roleRows, error: rErr } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (rErr) throw new Error(rErr.message);
    if (!(roleRows ?? []).some((r: any) => r.role === "super_admin")) {
      throw new Error("Only super_admin can send OTPs to users");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const result = await supabaseAdmin.auth.signInWithOtp({
      email, options: { shouldCreateUser: false },
    });
    const status = result.error ? "failed" : "sent";
    await supabaseAdmin.from("auth_events").insert({
      email, event_type: "admin_otp_sent", success: !result.error,
      message: result.error?.message ?? `OTP dispatched by admin ${context.userId}`,
      metadata: { triggered_by: context.userId, status },
    });
    if (result.error) throw new Error(result.error.message);
    return { ok: true, status, sent_at: new Date().toISOString() };
  });
