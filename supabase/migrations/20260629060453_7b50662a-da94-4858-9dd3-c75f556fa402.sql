
-- Fix function search_path
ALTER FUNCTION public.tg_set_updated_at()        SET search_path = public;
ALTER FUNCTION public.tg_products_autocalc()     SET search_path = public;
ALTER FUNCTION public.tg_purchase_calc()         SET search_path = public;

-- Recreate view as security_invoker
DROP VIEW IF EXISTS public.v_current_stock;
CREATE VIEW public.v_current_stock WITH (security_invoker = true) AS
SELECT
  m.id   AS material_id, m.code AS material_code, m.name AS material_name,
  p.id   AS plant_id,    p.code AS plant_code,
  COALESCE(SUM(t.qty_in - t.qty_out),0) AS current_stock,
  m.reorder_level,
  CASE WHEN COALESCE(SUM(t.qty_in - t.qty_out),0) <= m.reorder_level THEN TRUE ELSE FALSE END AS is_low
FROM public.materials m
CROSS JOIN public.plants p
LEFT JOIN public.inventory_transactions t ON t.material_id = m.id AND t.plant_id = p.id
GROUP BY m.id, m.code, m.name, p.id, p.code, m.reorder_level;
GRANT SELECT ON public.v_current_stock TO authenticated;

-- Lock down audit_logs insert (only auth.uid() matches)
DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_logs;
CREATE POLICY "audit_insert_self" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Revoke EXECUTE on security-definer helpers from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[])   FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_is_admin()                 FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[])   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_user_is_admin()                 TO authenticated;
