
-- 1. BOM table
CREATE TABLE public.product_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  qty_per_unit numeric(14,4) NOT NULL CHECK (qty_per_unit >= 0),
  uom text NOT NULL DEFAULT 'pcs',
  is_auto boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_bom TO authenticated;
GRANT ALL ON public.product_bom TO service_role;

ALTER TABLE public.product_bom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_read" ON public.product_bom FOR SELECT TO authenticated USING (true);
CREATE POLICY "bom_admin_write" ON public.product_bom FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE TRIGGER trg_bom_updated_at BEFORE UPDATE ON public.product_bom
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_bom_product ON public.product_bom(product_id);
CREATE INDEX idx_bom_material ON public.product_bom(material_id);

-- 2. Wipe transactional data
TRUNCATE public.inventory_transactions, public.gap_verifications, public.scrap_entries,
         public.production_entries, public.purchase_orders RESTART IDENTITY CASCADE;

-- 3. Seed default BOM for every product
DO $$
DECLARE
  m_p1 uuid; m_pj3 uuid; m_endcap uuid; m_wheel uuid;
  r RECORD;
  upname text;
BEGIN
  SELECT id INTO m_p1 FROM public.materials WHERE code='P1';
  SELECT id INTO m_pj3 FROM public.materials WHERE code='PJ3';
  SELECT id INTO m_endcap FROM public.materials WHERE code='ENDCAP';
  SELECT id INTO m_wheel FROM public.materials WHERE code='W3X1-S';

  FOR r IN SELECT id, name, material_id, total_meter FROM public.products LOOP
    upname := UPPER(r.name);

    -- Pipe component (auto, qty = total_meter, material = product.material_id)
    IF r.material_id IS NOT NULL THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, is_auto, notes)
      VALUES (r.id, r.material_id, COALESCE(r.total_meter,0), 'meter', true, 'Auto from dimensions')
      ON CONFLICT (product_id, material_id) DO UPDATE SET qty_per_unit = EXCLUDED.qty_per_unit;
    END IF;

    IF upname LIKE '%TROLLEY%' THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_p1, 8, 'pcs', 'Default Trolley BOM'),
        (r.id, m_pj3, 4, 'pcs', 'Default Trolley BOM'),
        (r.id, m_endcap, 4, 'pcs', 'Default Trolley BOM'),
        (r.id, m_wheel, 4, 'pcs', 'Default Trolley BOM')
      ON CONFLICT DO NOTHING;
    ELSIF upname LIKE '%RACK%' THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_p1, 12, 'pcs', 'Default Rack BOM'),
        (r.id, m_pj3, 8, 'pcs', 'Default Rack BOM'),
        (r.id, m_endcap, 8, 'pcs', 'Default Rack BOM')
      ON CONFLICT DO NOTHING;
    ELSIF upname LIKE '%TABLE%' THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_p1, 6, 'pcs', 'Default Table BOM'),
        (r.id, m_pj3, 4, 'pcs', 'Default Table BOM'),
        (r.id, m_endcap, 4, 'pcs', 'Default Table BOM')
      ON CONFLICT DO NOTHING;
    ELSIF upname LIKE '%STAND%' OR upname LIKE '%BIN STAND%' THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_p1, 10, 'pcs', 'Default Stand BOM'),
        (r.id, m_pj3, 5, 'pcs', 'Default Stand BOM'),
        (r.id, m_endcap, 4, 'pcs', 'Default Stand BOM')
      ON CONFLICT DO NOTHING;
    ELSIF upname LIKE '%BIN%' THEN
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_p1, 6, 'pcs', 'Default Bin BOM'),
        (r.id, m_endcap, 4, 'pcs', 'Default Bin BOM')
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, notes) VALUES
        (r.id, m_endcap, 4, 'pcs', 'Default BOM')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 4. Keep auto Pipe row in sync when product dimensions change
CREATE OR REPLACE FUNCTION public.tg_products_sync_bom_pipe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.material_id IS NOT NULL THEN
    INSERT INTO public.product_bom(product_id, material_id, qty_per_unit, uom, is_auto, notes)
    VALUES (NEW.id, NEW.material_id, COALESCE(NEW.total_meter,0), 'meter', true, 'Auto from dimensions')
    ON CONFLICT (product_id, material_id) DO UPDATE
      SET qty_per_unit = EXCLUDED.qty_per_unit, is_auto = true, updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_sync_bom_pipe ON public.products;
CREATE TRIGGER trg_products_sync_bom_pipe
  AFTER INSERT OR UPDATE OF length_mm, width_mm, height_mm, material_id, total_meter
  ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_products_sync_bom_pipe();

-- 5. Rewrite production inventory posting: loop BOM
CREATE OR REPLACE FUNCTION public.tg_production_post_inventory()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
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
END $$;

-- 6. Gap compute: read expected consumption from inventory ledger (material-wise)
CREATE OR REPLACE FUNCTION public.tg_gap_compute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_expected NUMERIC := 0; v_purchased NUMERIC := 0;
  v_system NUMERIC := 0; v_wpct NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(qty_out),0) INTO v_expected
    FROM public.inventory_transactions
    WHERE plant_id=NEW.plant_id AND material_id=NEW.material_id
      AND txn_type='production_out' AND txn_date::date <= NEW.verify_date;

  SELECT COALESCE(SUM(received_qty),0) INTO v_purchased
    FROM public.purchase_orders
    WHERE plant_id=NEW.plant_id AND material_id=NEW.material_id
      AND po_date <= NEW.verify_date AND status='approved';

  SELECT COALESCE(SUM(qty_in - qty_out),0) INTO v_system
    FROM public.inventory_transactions
    WHERE plant_id=NEW.plant_id AND material_id=NEW.material_id
      AND txn_date::date <= NEW.verify_date;

  SELECT COALESCE(allowed_wastage_pct,0) INTO v_wpct FROM public.materials WHERE id=NEW.material_id;

  NEW.expected_consumption := v_expected;
  NEW.purchased_qty := v_purchased;
  NEW.system_stock := v_system;
  NEW.allowed_wastage := ROUND((v_expected*v_wpct/100.0)::numeric,4);
  NEW.difference := ROUND((NEW.physical_stock - v_system)::numeric,4);
  NEW.actual_gap := ROUND((NEW.difference - NEW.allowed_wastage)::numeric,4);
  RETURN NEW;
END $$;

-- 7. Audit
CREATE TRIGGER trg_audit_product_bom AFTER INSERT OR UPDATE OR DELETE ON public.product_bom
  FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row();
