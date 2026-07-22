
-- =========================================================================
-- Drop legacy operational + master objects
-- =========================================================================
DROP TABLE IF EXISTS public.scrap_entries CASCADE;
DROP TABLE IF EXISTS public.gap_verifications CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.product_bom CASCADE;
DROP TABLE IF EXISTS public.production_entries CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.pipe_sizes CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.supervisors CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.user_plants CASCADE;
DROP TABLE IF EXISTS public.plants CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;

DROP FUNCTION IF EXISTS public.tg_scrap_post_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.tg_purchase_post_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.tg_production_post_inventory() CASCADE;
DROP FUNCTION IF EXISTS public.tg_purchase_calc() CASCADE;
DROP FUNCTION IF EXISTS public.tg_products_autocalc() CASCADE;
DROP FUNCTION IF EXISTS public.tg_products_sync_bom_pipe() CASCADE;
DROP FUNCTION IF EXISTS public.tg_production_calc() CASCADE;
DROP FUNCTION IF EXISTS public.tg_gap_compute() CASCADE;
DROP FUNCTION IF EXISTS public.tg_notify_low_stock() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_plant(uuid, uuid) CASCADE;

-- =========================================================================
-- New enums
-- =========================================================================
DO $$ BEGIN CREATE TYPE public.material_uom AS ENUM ('PCS','MTR','SET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.po_status AS ENUM ('open','partial','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.inventory_txn_type AS ENUM ('opening','purchase','fabrication','adjustment','return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- Sequences
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS public.seq_material_code   START 10025;
CREATE SEQUENCE IF NOT EXISTS public.seq_po_no           START 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_receipt_no      START 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_fabrication_no  START 1001;
CREATE SEQUENCE IF NOT EXISTS public.seq_product_code    START 1001;

-- =========================================================================
-- Operator helper (locked to authenticated + service_role)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_operator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_any_role(_user_id, ARRAY[
    'super_admin','plant_admin',
    'purchase','store','fabrication','innovation_head',
    'purchase_manager','purchase_executive','store_manager',
    'production_manager','production_operator',
    'quality_manager','auditor','viewer'
  ]::public.app_role[])
$$;
REVOKE EXECUTE ON FUNCTION public.is_operator(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_operator(uuid) TO authenticated, service_role;

-- =========================================================================
-- Masters
-- =========================================================================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  gstin text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers read"  ON public.suppliers FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "suppliers write" ON public.suppliers FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments read"  ON public.departments FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "departments write" ON public.departments FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisors TO authenticated;
GRANT ALL ON public.supervisors TO service_role;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisors read"  ON public.supervisors FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "supervisors write" ON public.supervisors FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  uom public.material_uom NOT NULL DEFAULT 'PCS',
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  reorder_level numeric(14,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials read"  ON public.materials FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "materials write" ON public.materials FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products read"  ON public.products FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "products write" ON public.products FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.product_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id)  ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  qty_per_unit numeric(14,4) NOT NULL,
  uom public.material_uom NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, material_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_bom TO authenticated;
GRANT ALL ON public.product_bom TO service_role;
ALTER TABLE public.product_bom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bom read"  ON public.product_bom FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "bom write" ON public.product_bom FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

-- =========================================================================
-- Purchase Orders + Items + Receipts
-- =========================================================================
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no text UNIQUE NOT NULL,
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  remarks text,
  status public.po_status NOT NULL DEFAULT 'open',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po read"  ON public.purchase_orders FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "po write" ON public.purchase_orders FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  uom public.material_uom NOT NULL,
  ordered_qty numeric(14,3) NOT NULL,
  rate numeric(14,4) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  received_qty numeric(14,3) NOT NULL DEFAULT 0,
  pending_qty  numeric(14,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po items read"  ON public.purchase_order_items FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "po items write" ON public.purchase_order_items FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.material_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no text UNIQUE NOT NULL,
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  invoice_no text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  remarks text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_receipts TO authenticated;
GRANT ALL ON public.material_receipts TO service_role;
ALTER TABLE public.material_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt read"  ON public.material_receipts FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "receipt write" ON public.material_receipts FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.material_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.material_receipts(id) ON DELETE CASCADE,
  po_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  received_qty numeric(14,3) NOT NULL,
  uom public.material_uom NOT NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_receipt_items TO authenticated;
GRANT ALL ON public.material_receipt_items TO service_role;
ALTER TABLE public.material_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt items read"  ON public.material_receipt_items FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "receipt items write" ON public.material_receipt_items FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

-- =========================================================================
-- Fabrication
-- =========================================================================
CREATE TABLE public.fabrication_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text UNIQUE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  supervisor_id uuid REFERENCES public.supervisors(id) ON DELETE SET NULL,
  quantity numeric(14,3) NOT NULL,
  remarks text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fabrication_entries TO authenticated;
GRANT ALL ON public.fabrication_entries TO service_role;
ALTER TABLE public.fabrication_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fab read"  ON public.fabrication_entries FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "fab write" ON public.fabrication_entries FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

CREATE TABLE public.fabrication_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fabrication_id uuid NOT NULL REFERENCES public.fabrication_entries(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  required_qty numeric(14,3) NOT NULL,
  consumed_qty numeric(14,3) NOT NULL,
  uom public.material_uom NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fabrication_consumptions TO authenticated;
GRANT ALL ON public.fabrication_consumptions TO service_role;
ALTER TABLE public.fabrication_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fab con read"  ON public.fabrication_consumptions FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "fab con write" ON public.fabrication_consumptions FOR ALL    TO authenticated USING (public.is_operator(auth.uid())) WITH CHECK (public.is_operator(auth.uid()));

-- =========================================================================
-- Inventory ledger
-- =========================================================================
CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date timestamptz NOT NULL DEFAULT now(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  txn_type public.inventory_txn_type NOT NULL,
  qty_in  numeric(14,3) NOT NULL DEFAULT 0,
  qty_out numeric(14,3) NOT NULL DEFAULT 0,
  ref_table text,
  ref_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_transactions_material_date_idx ON public.inventory_transactions (material_id, txn_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger read"        ON public.inventory_transactions FOR SELECT TO authenticated USING (public.is_operator(auth.uid()));
CREATE POLICY "ledger admin write" ON public.inventory_transactions FOR ALL    TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store']::public.app_role[]));

-- =========================================================================
-- Current stock view
-- =========================================================================
CREATE OR REPLACE VIEW public.v_current_stock AS
SELECT m.id AS material_id, m.code, m.name, m.uom,
       m.min_stock, m.reorder_level,
       COALESCE(SUM(it.qty_in - it.qty_out), 0) AS current_stock
FROM public.materials m
LEFT JOIN public.inventory_transactions it ON it.material_id = m.id
GROUP BY m.id;
GRANT SELECT ON public.v_current_stock TO authenticated, service_role;

-- =========================================================================
-- Triggers
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tg_material_autocode()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := 'MAT-' || lpad(nextval('public.seq_material_code')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER material_autocode BEFORE INSERT ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.tg_material_autocode();
CREATE TRIGGER material_touch BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_product_autocode()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := 'PRD-' || lpad(nextval('public.seq_product_code')::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_autocode BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_product_autocode();
CREATE TRIGGER product_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER supplier_touch    BEFORE UPDATE ON public.suppliers    FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER department_touch  BEFORE UPDATE ON public.departments  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER supervisor_touch  BEFORE UPDATE ON public.supervisors  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER bom_touch         BEFORE UPDATE ON public.product_bom  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_po_autono()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.po_no IS NULL OR btrim(NEW.po_no) = '' THEN
    NEW.po_no := 'PO-' || to_char(now(),'YY') || '-' || lpad(nextval('public.seq_po_no')::text, 5, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER po_autono BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_po_autono();
CREATE TRIGGER po_touch BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_po_item_calc()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.amount := ROUND((COALESCE(NEW.ordered_qty,0) * COALESCE(NEW.rate,0))::numeric, 2);
  NEW.pending_qty := GREATEST(COALESCE(NEW.ordered_qty,0) - COALESCE(NEW.received_qty,0), 0);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER po_item_calc BEFORE INSERT OR UPDATE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_po_item_calc();

CREATE OR REPLACE FUNCTION public.tg_po_rollup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_po uuid; v_total numeric; v_ordered numeric; v_recv numeric;
BEGIN
  v_po := COALESCE(NEW.po_id, OLD.po_id);
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(ordered_qty),0), COALESCE(SUM(received_qty),0)
    INTO v_total, v_ordered, v_recv
  FROM public.purchase_order_items WHERE po_id = v_po;

  UPDATE public.purchase_orders
    SET total_amount = v_total,
        status = CASE
          WHEN v_ordered = 0 THEN 'open'
          WHEN v_recv >= v_ordered THEN 'completed'
          WHEN v_recv > 0 THEN 'partial'
          ELSE 'open'
        END,
        updated_at = now()
    WHERE id = v_po;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_po_rollup() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER po_rollup AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_po_rollup();

CREATE OR REPLACE FUNCTION public.tg_receipt_autono()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.receipt_no IS NULL OR btrim(NEW.receipt_no) = '' THEN
    NEW.receipt_no := 'GRN-' || to_char(now(),'YY') || '-' || lpad(nextval('public.seq_receipt_no')::text, 5, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER receipt_autono BEFORE INSERT ON public.material_receipts
  FOR EACH ROW EXECUTE FUNCTION public.tg_receipt_autono();
CREATE TRIGGER receipt_touch BEFORE UPDATE ON public.material_receipts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_receipt_item_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_rcpt text; v_po uuid;
BEGIN
  SELECT receipt_no, po_id INTO v_rcpt, v_po FROM public.material_receipts WHERE id = NEW.receipt_id;
  INSERT INTO public.inventory_transactions
    (txn_date, material_id, txn_type, qty_in, ref_table, ref_id, user_id, remarks)
  VALUES
    (now(), NEW.material_id, 'purchase', NEW.received_qty,
     'material_receipt_items', NEW.id, auth.uid(),
     'Auto: receipt ' || COALESCE(v_rcpt,''));

  UPDATE public.purchase_order_items
    SET received_qty = COALESCE(received_qty,0) + NEW.received_qty
    WHERE id = NEW.po_item_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_receipt_item_post() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER receipt_item_post AFTER INSERT ON public.material_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_receipt_item_post();

CREATE OR REPLACE FUNCTION public.tg_fab_autono()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.entry_no IS NULL OR btrim(NEW.entry_no) = '' THEN
    NEW.entry_no := 'FAB-' || to_char(now(),'YY') || '-' || lpad(nextval('public.seq_fabrication_no')::text, 5, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER fab_autono BEFORE INSERT ON public.fabrication_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_fab_autono();
CREATE TRIGGER fab_touch BEFORE UPDATE ON public.fabrication_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_fab_expand()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b RECORD; v_qty numeric;
BEGIN
  FOR b IN SELECT material_id, qty_per_unit, uom FROM public.product_bom WHERE product_id = NEW.product_id LOOP
    v_qty := ROUND((NEW.quantity * b.qty_per_unit)::numeric, 4);
    INSERT INTO public.fabrication_consumptions
      (fabrication_id, material_id, required_qty, consumed_qty, uom)
    VALUES (NEW.id, b.material_id, v_qty, v_qty, b.uom);
    INSERT INTO public.inventory_transactions
      (txn_date, material_id, txn_type, qty_out, ref_table, ref_id, user_id, remarks)
    VALUES (now(), b.material_id, 'fabrication', v_qty,
            'fabrication_entries', NEW.id, auth.uid(),
            'Auto: fabrication ' || COALESCE(NEW.entry_no,''));
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_fab_expand() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fab_expand AFTER INSERT ON public.fabrication_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_fab_expand();

-- =========================================================================
-- Seed default materials + departments
-- =========================================================================
INSERT INTO public.materials (code, name, uom, category) VALUES
  ('MAT-10001','40 TYPE PLACON ROLLER','MTR','Roller'),
  ('MAT-10002','80 TYPE PLACON ROLLER','MTR','Roller'),
  ('MAT-10003','40 TYPE A1 JOINT','PCS','Joint'),
  ('MAT-10004','80 TYPE A1 JOINT','PCS','Joint'),
  ('MAT-10005','40 TYPE B2 JOINT','PCS','Joint'),
  ('MAT-10006','80 TYPE B2 JOINT','PCS','Joint'),
  ('MAT-10007','PJ1','SET','Joint'),
  ('MAT-10008','P100 JOINT','SET','Joint'),
  ('MAT-10009','PJ14 JOINT','SET','Joint'),
  ('MAT-10010','PJ16 JOINT','SET','Joint'),
  ('MAT-10011','PJ18 JOINT','SET','Joint'),
  ('MAT-10012','PJ2 JOINT','SET','Joint'),
  ('MAT-10013','PJ3 JOINT','SET','Joint'),
  ('MAT-10014','PJ5 JOINT','SET','Joint'),
  ('MAT-10015','PJ4 JOINT','SET','Joint'),
  ('MAT-10016','PJ7 JOINT','SET','Joint'),
  ('MAT-10017','PJ8 JOINT','SET','Joint'),
  ('MAT-10018','PJ15 JOINT','SET','Joint'),
  ('MAT-10019','SS PIPE','MTR','Pipe'),
  ('MAT-10020','6X2 PU WHEEL SWIVEL LOCK','PCS','Wheel'),
  ('MAT-10021','6X2 PU WHEEL FIXED','PCS','Wheel'),
  ('MAT-10022','3X1.25 PU WHEEL SWIVEL','PCS','Wheel'),
  ('MAT-10023','3X1.25 PU WHEEL SWIVEL LOCK','PCS','Wheel'),
  ('MAT-10024','END CAP','PCS','Accessory');

INSERT INTO public.departments (code, name) VALUES
  ('INN','Innovation'),
  ('FAB','Fabrication'),
  ('WLD','Welding');
