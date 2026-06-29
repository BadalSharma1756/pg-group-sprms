
-- Audit log extensions
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES public.plants(id),
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS entity_label text,
  ADD COLUMN IF NOT EXISTS old_status text,
  ADD COLUMN IF NOT EXISTS new_status text;

CREATE INDEX IF NOT EXISTS idx_audit_plant_date ON public.audit_logs(plant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table_date ON public.audit_logs(table_name, created_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.tg_audit_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old_status text;
  v_new_status text;
  v_plant uuid;
  v_dept uuid;
  v_label text;
  v_record text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_status := COALESCE((to_jsonb(NEW)->>'status'), null);
    v_record := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_status := COALESCE((to_jsonb(OLD)->>'status'), null);
    v_new_status := COALESCE((to_jsonb(NEW)->>'status'), null);
    IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status IS NOT NULL THEN
      v_action := v_new_status; -- approved / rejected / pending
    ELSE
      v_action := 'update';
    END IF;
    v_record := NEW.id::text;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_record := OLD.id::text;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_plant := (to_jsonb(NEW)->>'plant_id')::uuid;
    v_dept  := (to_jsonb(NEW)->>'department_id')::uuid;
    v_label := COALESCE(
      to_jsonb(NEW)->>'entry_no',
      to_jsonb(NEW)->>'po_no',
      to_jsonb(NEW)->>'scrap_no',
      to_jsonb(NEW)->>'verify_no',
      to_jsonb(NEW)->>'code',
      to_jsonb(NEW)->>'name'
    );
  ELSE
    v_plant := (to_jsonb(OLD)->>'plant_id')::uuid;
    v_dept  := (to_jsonb(OLD)->>'department_id')::uuid;
    v_label := COALESCE(
      to_jsonb(OLD)->>'entry_no',
      to_jsonb(OLD)->>'po_no',
      to_jsonb(OLD)->>'scrap_no',
      to_jsonb(OLD)->>'verify_no'
    );
  END IF;

  INSERT INTO public.audit_logs(user_id, action, table_name, record_id, plant_id, department_id, entity_label, old_status, new_status, detail)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_record, v_plant, v_dept, v_label, v_old_status, v_new_status,
          jsonb_build_object('op', TG_OP));

  RETURN COALESCE(NEW, OLD);
END $$;

-- Attach to key transactional tables
DROP TRIGGER IF EXISTS audit_production ON public.production_entries;
CREATE TRIGGER audit_production AFTER INSERT OR UPDATE OR DELETE ON public.production_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_purchase ON public.purchase_orders;
CREATE TRIGGER audit_purchase AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_scrap ON public.scrap_entries;
CREATE TRIGGER audit_scrap AFTER INSERT OR UPDATE OR DELETE ON public.scrap_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_gap ON public.gap_verifications;
CREATE TRIGGER audit_gap AFTER INSERT OR UPDATE OR DELETE ON public.gap_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();

DROP TRIGGER IF EXISTS audit_inventory ON public.inventory_transactions;
CREATE TRIGGER audit_inventory AFTER INSERT OR UPDATE OR DELETE ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
