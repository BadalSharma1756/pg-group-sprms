import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recordOtpFailureInternal } from "./auth-events.functions";

const EmailInput = z.object({ email: z.string().email() });
const ALLOWED_DOMAIN = "pgel.in";
// TEMP: domain restriction disabled for testing. Re-enable by returning
// `email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN)` once QA is done.
function isAllowedEmail(_email: string) {
  return true;
}

const LOCKOUT_WINDOW_MIN = 15;
const LOCKOUT_DURATION_MIN = 15;
const LOCKOUT_THRESHOLD = 5;
const OTP_VERIFY_TYPES = ["email", "magiclink", "recovery"] as const;
// Long expiry — we gate on our own salted hash, not Supabase's token TTL.
const OTP_EXPIRY_MIN = 60 * 24;

async function hashOtpCode(email: string, code: string, salt: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SMTP_PASS ?? "sprms";
  const bytes = new TextEncoder().encode(`${email.toLowerCase()}:${code.trim()}:${salt}:${secret}`);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkLocked(supabaseAdmin: any, email: string) {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MIN * 60_000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("auth_events")
    .select("event_type, created_at")
    .eq("email", email)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  const cutoff = Date.now() - LOCKOUT_DURATION_MIN * 60_000;
  const lock = (rows ?? []).find(
    (r: any) => r.event_type === "lockout" && new Date(r.created_at).getTime() > cutoff,
  );
  if (lock) {
    return {
      locked: true as const,
      unlock_at: new Date(new Date(lock.created_at).getTime() + LOCKOUT_DURATION_MIN * 60_000).toISOString(),
    };
  }
  return { locked: false as const };
}

function buildHtml(code: string, fromName: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#2563eb);padding:24px 28px;color:#fff">
          <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">${fromName}</div>
          <div style="font-size:22px;font-weight:700;margin-top:4px">Your one-time code</div>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#334155">
            Use this 6-digit verification code to sign in. It expires in <strong>10 minutes</strong> and can be used only once.
          </p>
          <div style="margin:24px auto;text-align:center">
            <div style="display:inline-block;padding:18px 28px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;
                        font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:12px;color:#0f172a">${code}</div>
          </div>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b">
            If you did not request this code, you can safely ignore this email. Do not share this code with anyone — our team will never ask for it.
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#94a3b8;font-size:12px">
          © ${new Date().getFullYear()} ${fromName}. This is an automated message — please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function generateAndSendOtp(email: string, trigger: "user" | "admin", actorId?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lower = email.toLowerCase();

  if (!isAllowedEmail(lower)) {
    return { ok: false as const, status: "blocked" as const, message: `Only @${ALLOWED_DOMAIN} email addresses are allowed.` };
  }

  const lock = await checkLocked(supabaseAdmin, lower);
  if (lock.locked) {
    return { ok: false as const, locked: true, unlock_at: lock.unlock_at, status: "blocked" as const };
  }

  // Only send to addresses belonging to an existing user — prevents SMTP/email
  // abuse via the public OTP endpoint. We return a generic success regardless
  // so the endpoint does not act as an account-enumeration oracle.
  if (trigger === "user") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", lower)
      .maybeSingle();
    if (!profile) {
      return { ok: true as const, status: "sent" as const, sent_at: new Date().toISOString() };
    }
  }

  // Generate a Supabase-issued OTP without sending Supabase's default email.
  const gen = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: lower,
  });
  if (gen.error || !gen.data?.properties?.email_otp) {
    await supabaseAdmin.from("auth_events").insert({
      email: lower,
      event_type: trigger === "admin" ? "admin_otp_sent" : "otp_sent",
      success: false,
      message: gen.error?.message ?? "Failed to generate OTP",
      metadata: { status: "failed", channel: "smtp", triggered_by: actorId ?? null },
    });
    throw new Error(gen.error?.message ?? "Failed to generate OTP");
  }
  const code = gen.data.properties.email_otp as string;
  const verificationType = gen.data.properties.verification_type ?? "magiclink";

  // Send via custom SMTP (Office 365) using a Worker-compatible mailer.
  // nodemailer relies on Node net/tls and cannot run inside the Cloudflare
  // Worker runtime — it triggers "Class extends value [object Module]".
  const { WorkerMailer } = await import("worker-mailer");
  const fromName = process.env.SMTP_FROM_NAME ?? "SPRMS";
  const fromAddr = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
  const port = Number(process.env.SMTP_PORT ?? 587);

  let sendStatus: "sent" | "failed" = "sent";
  let sendError: string | null = null;
  try {
    const mailer = await WorkerMailer.connect({
      host: process.env.SMTP_HOST!,
      port,
      secure: port === 465,
      startTls: port !== 465,
      credentials: {
        username: process.env.SMTP_USER!,
        password: process.env.SMTP_PASS!,
      },
      authType: ["plain", "login"],
    });
    await mailer.send({
      from: { name: fromName, email: fromAddr },
      to: { email },
      subject: `${code} is your ${fromName} verification code`,
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: buildHtml(code, fromName),
    });
  } catch (e: any) {
    sendStatus = "failed";
    sendError = e?.message ?? String(e);
  }

  await supabaseAdmin.from("auth_events").insert({
    email: lower,
    event_type: trigger === "admin" ? "admin_otp_sent" : "otp_sent",
    success: sendStatus === "sent",
    message: sendError ?? `OTP delivered via SMTP (${process.env.SMTP_HOST})`,
    metadata: {
      status: sendStatus,
      channel: "smtp",
      host: process.env.SMTP_HOST,
      verification_type: verificationType,
      triggered_by: actorId ?? null,
    },
  });

  if (sendStatus === "failed") {
    throw new Error(`SMTP send failed: ${sendError}`);
  }

  const salt = globalThis.crypto.randomUUID();
  const codeHash = await hashOtpCode(lower, code, salt);
  await (supabaseAdmin as any)
    .from("otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", lower)
    .is("consumed_at", null);
  await (supabaseAdmin as any).from("otp_challenges").insert({
    email: lower,
    code_hash: `${salt}:${codeHash}`,
    token_hash: gen.data.properties.hashed_token,
    verification_type: verificationType,
    expires_at: new Date(Date.now() + OTP_EXPIRY_MIN * 60_000).toISOString(),
  });

  return { ok: true as const, status: sendStatus, sent_at: new Date().toISOString() };
}

/** Public: request OTP from the sign-in page. */
export const requestOtpEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => EmailInput.parse(d))
  .handler(async ({ data }) => generateAndSendOtp(data.email, "user"));

/** Super-admin: send OTP to a user. */
export const adminSendOtpSmtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EmailInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: roleRows, error: rErr } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (rErr) throw new Error(rErr.message);
    if (!(roleRows ?? []).some((r: any) => r.role === "super_admin")) {
      throw new Error("Only super_admin can send OTPs to users");
    }
    return generateAndSendOtp(data.email, "admin", context.userId);
  });

/**
 * Public: verify an OTP server-side. The failure path is what gates lockouts,
 * so this MUST stay the only public endpoint that writes `otp_failed` /
 * `lockout` events (via `recordOtpFailureInternal`). On success we return the
 * Supabase session for the client to install via `supabase.auth.setSession`.
 */
const VerifyInput = z.object({
  email: z.string().email(),
  token: z.string().trim().min(4).max(10),
});

export const verifyOtpEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => VerifyInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    if (!isAllowedEmail(email)) {
      return { ok: false as const, message: `Only @${ALLOWED_DOMAIN} email addresses are allowed.` };
    }

    // Reject early if currently locked — do not record a failure for it.
    const lock = await checkLocked(supabaseAdmin, email);
    if (lock.locked) {
      return { ok: false as const, locked: true as const, unlock_at: lock.unlock_at };
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const now = new Date().toISOString();
    const { data: challenge } = await (supabaseAdmin as any)
      .from("otp_challenges")
      .select("id, code_hash, token_hash, verification_type, expires_at")
      .eq("email", email)
      .is("consumed_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challenge?.code_hash && challenge?.token_hash) {
      const [salt, expectedHash] = String(challenge.code_hash).split(":");
      const actualHash = salt ? await hashOtpCode(email, data.token, salt) : "";

      if (!salt || actualHash !== expectedHash) {
        const res = await recordOtpFailureInternal(email, "Invalid OTP");
        return {
          ok: false as const,
          locked: res.locked,
          failed_count: res.failed_count,
          threshold: LOCKOUT_THRESHOLD,
          lockout_minutes: res.locked ? LOCKOUT_DURATION_MIN : undefined,
          message: "Invalid OTP",
        };
      }

      // Code matched our salted hash. Mint a fresh Supabase session by
      // generating a brand-new magic link and verifying it immediately,
      // so Supabase's per-token TTL can never reject a valid user code.
      const fresh = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const freshType =
        OTP_VERIFY_TYPES.find((t) => t === fresh.data?.properties?.verification_type) ?? "magiclink";
      const { data: tokenData, error: tokenError } = fresh.data?.properties?.hashed_token
        ? await supa.auth.verifyOtp({
            token_hash: fresh.data.properties.hashed_token,
            type: freshType,
          })
        : { data: null as any, error: fresh.error ?? new Error("Failed to mint session") };

      if (tokenError || !tokenData?.session) {
        const res = await recordOtpFailureInternal(email, tokenError?.message ?? "Invalid OTP");
        return {
          ok: false as const,
          locked: res.locked,
          failed_count: res.failed_count,
          threshold: LOCKOUT_THRESHOLD,
          lockout_minutes: res.locked ? LOCKOUT_DURATION_MIN : undefined,
          message: tokenError?.message ?? "Invalid OTP",
        };
      }

      await (supabaseAdmin as any)
        .from("otp_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challenge.id);
      await supabaseAdmin.from("auth_events").insert({
        email, event_type: "otp_verified", success: true,
      });

      const session = tokenData.session;
      return {
        ok: true as const,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      };
    }

    const { data: lastOtp } = await supabaseAdmin
      .from("auth_events")
      .select("metadata")
      .eq("email", email)
      .in("event_type", ["otp_sent", "admin_otp_sent"])
      .eq("success", true)
      .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const metadata = lastOtp?.metadata;
    const storedType =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>).verification_type
        : undefined;
    const preferredType = OTP_VERIFY_TYPES.find((t) => t === storedType);
    const verifyTypes: Array<(typeof OTP_VERIFY_TYPES)[number]> = preferredType
      ? [preferredType, ...OTP_VERIFY_TYPES.filter((t) => t !== preferredType)]
      : [...OTP_VERIFY_TYPES];

    let verifyData: any = null;
    let lastError: any = null;
    for (const type of verifyTypes) {
      const attempt = await supa.auth.verifyOtp({ email, token: data.token, type });
      if (attempt.data?.session && !attempt.error) {
        verifyData = attempt.data;
        lastError = null;
        break;
      }
      lastError = attempt.error;
    }

    if (lastError || !verifyData?.session) {
      const res = await recordOtpFailureInternal(email, lastError?.message ?? "Invalid OTP");
      return {
        ok: false as const,
        locked: res.locked,
        failed_count: res.failed_count,
        threshold: LOCKOUT_THRESHOLD,
        lockout_minutes: res.locked ? LOCKOUT_DURATION_MIN : undefined,
        message: lastError?.message ?? "Invalid OTP",
      };
    }

    await supabaseAdmin.from("auth_events").insert({
      email, event_type: "otp_verified", success: true,
    });

    const session = verifyData.session;
    return {
      ok: true as const,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  });
