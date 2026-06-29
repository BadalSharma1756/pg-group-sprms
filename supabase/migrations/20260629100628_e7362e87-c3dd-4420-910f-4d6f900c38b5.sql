CREATE OR REPLACE FUNCTION public.tg_production_post_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE b RECORD;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> 'approved' AND NEW.status = 'approved') THEN
    FOR b IN
      SELECT material_id, qty_per_unit FROM public.product_bom WHERE product_id = NEW.product_id
    LOOP
      INSERT INTO public.inventory_transactions
        (txn_date, material_id, plant_id, txn_type, qty_out, ref_table, ref_id, remarks)
      VALUES
        (now(), b.material_id, NEW.plant_id, 'production_out',
         ROUND((NEW.quantity * b.qty_per_unit)::numeric, 4),
         'production_entries', NEW.id,
         'Auto: production ' || NEW.entry_no);
    END LOOP;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.tg_purchase_post_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status <> 'approved' AND NEW.status = 'approved') THEN
    INSERT INTO public.inventory_transactions
      (txn_date, material_id, plant_id, txn_type, qty_in, ref_table, ref_id, remarks)
    VALUES
      (now(), NEW.material_id, NEW.plant_id, 'purchase_in',
       COALESCE(NEW.received_qty, NEW.quantity), 'purchase_orders', NEW.id,
       'Auto: purchase ' || NEW.po_no);
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END $function$;

ALTER TABLE public.production_entries ALTER COLUMN status SET DEFAULT 'approved';
ALTER TABLE public.purchase_orders ALTER COLUMN status SET DEFAULT 'approved';

UPDATE public.production_entries SET status = 'approved', approved_at = COALESCE(approved_at, now()) WHERE status = 'pending';
UPDATE public.purchase_orders SET status = 'approved', approved_at = COALESCE(approved_at, now()) WHERE status = 'pending';