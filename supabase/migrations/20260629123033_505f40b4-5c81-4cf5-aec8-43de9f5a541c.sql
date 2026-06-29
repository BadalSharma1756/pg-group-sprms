
-- 1) auth_events: restrict self-insert to caller's own user_id; service role bypasses RLS
DROP POLICY IF EXISTS "auth_events self insert" ON public.auth_events;
CREATE POLICY "auth_events self insert"
ON public.auth_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- 2) suppliers: ensure all operationally-relevant roles can read supplier reference data
DROP POLICY IF EXISTS suppliers_read_roles ON public.suppliers;
CREATE POLICY suppliers_read_roles
ON public.suppliers
FOR SELECT
TO authenticated
USING (
  has_any_role(
    auth.uid(),
    ARRAY[
      'super_admin','plant_admin',
      'purchase_manager','purchase_executive',
      'production_manager','production_operator',
      'store_manager','quality_manager',
      'auditor'
    ]::app_role[]
  )
);
