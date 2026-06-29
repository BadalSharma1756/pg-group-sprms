
-- 1) Tighten suppliers SELECT: restrict to purchase/admin roles
DROP POLICY IF EXISTS "read_all_auth" ON public.suppliers;
CREATE POLICY "suppliers_read_roles" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.has_any_role(
    auth.uid(),
    ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive','auditor']::public.app_role[]
  ));

-- 2) Remove NULL plant_id bypass in user_can_access_plant
CREATE OR REPLACE FUNCTION public.user_can_access_plant(_user_id uuid, _plant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _plant_id IS NOT NULL
    AND (
      public.has_any_role(_user_id, ARRAY['super_admin','plant_admin']::public.app_role[])
      OR EXISTS (SELECT 1 FROM public.user_plants WHERE user_id=_user_id AND plant_id=_plant_id)
    )
$$;

-- 3) Lock down audit_logs inserts — only SECURITY DEFINER triggers should write
DROP POLICY IF EXISTS "audit_insert_self" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;

-- 4) Revoke EXECUTE on SECURITY DEFINER helper/trigger functions from public roles.
--    Trigger functions don't need direct EXECUTE; RLS helpers are inlined and
--    don't require EXECUTE for policy evaluation.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
