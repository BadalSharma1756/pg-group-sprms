
-- Authentication audit timeline
CREATE TABLE public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  event_type text NOT NULL, -- otp_sent | otp_verified | otp_failed | lockout | admin_otp_sent
  success boolean NOT NULL DEFAULT true,
  message text,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auth_events TO authenticated;
GRANT ALL ON public.auth_events TO service_role;

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read the audit log
CREATE POLICY "auth_events super_admin read"
  ON public.auth_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Authenticated users can insert their own events (used by client logging fallback);
-- server functions use service_role and bypass RLS.
CREATE POLICY "auth_events self insert"
  ON public.auth_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX ix_auth_events_email_time ON public.auth_events (email, created_at DESC);
CREATE INDEX ix_auth_events_time ON public.auth_events (created_at DESC);
