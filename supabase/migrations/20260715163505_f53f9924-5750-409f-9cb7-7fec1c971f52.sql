
-- 1. supervisors
CREATE TABLE IF NOT EXISTS public.supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  phone text,
  status entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisors TO authenticated;
GRANT ALL ON public.supervisors TO service_role;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisors_read_all_auth" ON public.supervisors FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisors_write_admin" ON public.supervisors FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER t_supervisors_updated BEFORE UPDATE ON public.supervisors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- add supervisor_id on production_entries (nullable, backward compatible)
ALTER TABLE public.production_entries
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.supervisors(id);

-- 2. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  ref_table text,
  ref_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read_own_or_broadcast" ON public.notifications FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_insert_any_auth" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. make product dimensions optional
ALTER TABLE public.products ALTER COLUMN pipe_size_id DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN length_mm DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN width_mm DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN height_mm DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN material_id DROP NOT NULL;

-- 4. update auto-calc trigger to no-op when dims are missing
CREATE OR REPLACE FUNCTION public.tg_products_autocalc()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  length_m NUMERIC; width_m NUMERIC; height_m NUMERIC; per_unit_m NUMERIC;
BEGIN
  IF NEW.length_mm IS NULL OR NEW.width_mm IS NULL OR NEW.height_mm IS NULL THEN
    NEW.total_meter := COALESCE(NEW.total_meter, 0);
    NEW.total_feet := COALESCE(NEW.total_feet, 0);
    NEW.pipes_required_4m := COALESCE(NEW.pipes_required_4m, 0);
    NEW.pipes_required_6m := COALESCE(NEW.pipes_required_6m, 0);
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  length_m := NEW.length_mm / 1000.0;
  width_m  := NEW.width_mm  / 1000.0;
  height_m := NEW.height_mm / 1000.0;
  per_unit_m := 2 * (length_m + width_m) + 4 * height_m;
  NEW.total_meter := ROUND(per_unit_m::numeric, 4);
  NEW.total_feet  := ROUND((per_unit_m * 3.28084)::numeric, 4);
  NEW.pipes_required_4m := ROUND((per_unit_m / 4.0)::numeric, 4);
  NEW.pipes_required_6m := ROUND((per_unit_m / 6.0)::numeric, 4);
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

-- 5. seed default departments on first plant
DO $$
DECLARE v_plant uuid; d text;
BEGIN
  SELECT id INTO v_plant FROM public.plants ORDER BY created_at LIMIT 1;
  IF v_plant IS NULL THEN RETURN; END IF;
  FOREACH d IN ARRAY ARRAY['Fabrication','Welding','Assembly','Finishing','Dispatch','Maintenance']
  LOOP
    INSERT INTO public.departments(plant_id, code, name)
    VALUES (v_plant, upper(substr(d,1,4)), d)
    ON CONFLICT (plant_id, code) DO NOTHING;
  END LOOP;
END $$;

-- 6. seed default products
DO $$
DECLARE v_plant uuid; v_dept uuid; p text;
BEGIN
  SELECT id INTO v_plant FROM public.plants ORDER BY created_at LIMIT 1;
  IF v_plant IS NULL THEN RETURN; END IF;
  SELECT id INTO v_dept FROM public.departments WHERE plant_id = v_plant AND code = 'FABR' LIMIT 1;
  IF v_dept IS NULL THEN SELECT id INTO v_dept FROM public.departments WHERE plant_id = v_plant LIMIT 1; END IF;
  IF v_dept IS NULL THEN RETURN; END IF;
  FOREACH p IN ARRAY ARRAY['Stand','Table','Rack','Trolley','Jig']
  LOOP
    INSERT INTO public.products(code, name, plant_id, department_id)
    VALUES ('P-'||upper(p), p, v_plant, v_dept)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- 7. low-stock notification trigger
CREATE OR REPLACE FUNCTION public.tg_notify_low_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_stock NUMERIC; v_reorder NUMERIC; v_name text;
BEGIN
  SELECT reorder_level, name INTO v_reorder, v_name FROM public.materials WHERE id = NEW.material_id;
  SELECT COALESCE(SUM(qty_in - qty_out),0) INTO v_stock FROM public.inventory_transactions WHERE material_id = NEW.material_id;
  IF v_reorder > 0 AND v_stock <= v_reorder THEN
    INSERT INTO public.notifications(kind, message, ref_table, ref_id)
    VALUES (
      CASE WHEN v_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      v_name || ' stock is ' || ROUND(v_stock,2)::text || ' (reorder at ' || ROUND(v_reorder,2)::text || ')',
      'materials', NEW.material_id::text
    );
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS t_inv_notify_low ON public.inventory_transactions;
CREATE TRIGGER t_inv_notify_low AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_low_stock();
