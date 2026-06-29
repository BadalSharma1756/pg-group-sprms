CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  token_hash text NOT NULL,
  verification_type text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.otp_challenges TO service_role;

ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_otp_challenges_email_latest
  ON public.otp_challenges (lower(email), created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires_at
  ON public.otp_challenges (expires_at);