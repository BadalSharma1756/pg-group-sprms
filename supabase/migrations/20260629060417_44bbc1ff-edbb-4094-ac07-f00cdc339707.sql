
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM (
  'super_admin','plant_admin','production_manager','production_operator',
  'purchase_manager','purchase_executive','store_manager','quality_manager',
  'auditor','viewer'
);
CREATE TYPE public.entity_status   AS ENUM ('active','inactive');
CREATE TYPE public.approval_status AS ENUM ('draft','pending','approved','rejected');
CREATE TYPE public.txn_type        AS ENUM ('opening','purchase_in','production_out','scrap_out','adjustment_in','adjustment_out','transfer_in','transfer_out','physical_verification');
CREATE TYPE public.shift_type      AS ENUM ('morning','afternoon','night','general');
CREATE TYPE public.unit_type       AS ENUM ('mm','cm','m','ft','inch');

-- =========================================================
-- PROFILES & ROLES (separate table — prevents privilege escalation)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  employee_code TEXT,
  phone TEXT,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL  ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin']::public.app_role[])
$$;

-- Auto-create profile + bootstrap super_admin to first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''));

  SELECT COUNT(*) INTO v_count FROM public.profiles;
  IF v_count = 1 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- MASTERS
-- =========================================================
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plant_id, code)
);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gstin TEXT, contact TEXT, email TEXT, address TEXT,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pipe_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  outer_diameter_mm NUMERIC(10,3) NOT NULL,
  thickness_mm NUMERIC(10,3) NOT NULL,
  weight_per_meter_kg NUMERIC(10,4),
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pipe_size_id UUID REFERENCES public.pipe_sizes(id),
  unit TEXT NOT NULL DEFAULT 'meter',
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  allowed_wastage_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  pipe_size_id UUID NOT NULL REFERENCES public.pipe_sizes(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  length_mm NUMERIC(12,3) NOT NULL,
  width_mm  NUMERIC(12,3) NOT NULL,
  height_mm NUMERIC(12,3) NOT NULL,
  unit public.unit_type NOT NULL DEFAULT 'mm',
  -- AUTO-CALCULATED — no manual editing
  total_feet  NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_meter NUMERIC(14,4) NOT NULL DEFAULT 0,
  pipes_required_4m NUMERIC(14,4) NOT NULL DEFAULT 0,
  pipes_required_6m NUMERIC(14,4) NOT NULL DEFAULT 0,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-calc on insert/update
CREATE OR REPLACE FUNCTION public.tg_products_autocalc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  length_m  NUMERIC; width_m NUMERIC; height_m NUMERIC;
  perimeter_per_unit_m NUMERIC;
BEGIN
  length_m  := NEW.length_mm  / 1000.0;
  width_m   := NEW.width_mm   / 1000.0;
  height_m  := NEW.height_mm  / 1000.0;
  -- One frame = 2*(L+W) base + 4 vertical legs of height
  perimeter_per_unit_m := 2 * (length_m + width_m) + 4 * height_m;
  NEW.total_meter := ROUND(perimeter_per_unit_m::numeric, 4);
  NEW.total_feet  := ROUND((perimeter_per_unit_m * 3.28084)::numeric, 4);
  NEW.pipes_required_4m := ROUND((perimeter_per_unit_m / 4.0)::numeric, 4);
  NEW.pipes_required_6m := ROUND((perimeter_per_unit_m / 6.0)::numeric, 4);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_products_autocalc
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.tg_products_autocalc();

-- updated_at triggers for masters
CREATE TRIGGER t1 BEFORE UPDATE ON public.plants      FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t2 BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t3 BEFORE UPDATE ON public.suppliers   FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t4 BEFORE UPDATE ON public.pipe_sizes  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t5 BEFORE UPDATE ON public.materials   FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- TRANSACTIONAL TABLES
-- =========================================================
CREATE TABLE public.production_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no TEXT NOT NULL UNIQUE DEFAULT ('PRD-' || to_char(now(),'YYYYMMDDHH24MISSMS')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift public.shift_type NOT NULL DEFAULT 'general',
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  -- auto-derived
  meter_per_unit NUMERIC(14,4) NOT NULL DEFAULT 0,
  total_meter_consumed NUMERIC(16,4) NOT NULL DEFAULT 0,
  pipes_consumed_4m NUMERIC(14,4) NOT NULL DEFAULT 0,
  pipes_consumed_6m NUMERIC(14,4) NOT NULL DEFAULT 0,
  material_id UUID REFERENCES public.materials(id),
  status public.approval_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prod_date ON public.production_entries(entry_date);
CREATE INDEX idx_prod_plant ON public.production_entries(plant_id);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_no TEXT NOT NULL UNIQUE DEFAULT ('PO-' || to_char(now(),'YYYYMMDDHH24MISSMS')),
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  invoice_no TEXT,
  invoice_date DATE,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  rate NUMERIC(14,4) NOT NULL DEFAULT 0,
  gst_pct NUMERIC(5,2) NOT NULL DEFAULT 18,
  transport NUMERIC(14,2) NOT NULL DEFAULT 0,
  received_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  pending_qty NUMERIC(14,3) NOT NULL DEFAULT 0,
  total_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  status public.approval_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_date ON public.purchase_orders(po_date);

-- Inventory ledger (single source of truth)
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  txn_type public.txn_type NOT NULL,
  qty_in  NUMERIC(16,4) NOT NULL DEFAULT 0,
  qty_out NUMERIC(16,4) NOT NULL DEFAULT 0,
  ref_table TEXT, ref_id UUID,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_material ON public.inventory_transactions(material_id, plant_id, txn_date);

-- Current-stock view
CREATE OR REPLACE VIEW public.v_current_stock AS
SELECT
  m.id   AS material_id,
  m.code AS material_code,
  m.name AS material_name,
  p.id   AS plant_id,
  p.code AS plant_code,
  COALESCE(SUM(t.qty_in - t.qty_out),0) AS current_stock,
  m.reorder_level,
  CASE WHEN COALESCE(SUM(t.qty_in - t.qty_out),0) <= m.reorder_level THEN TRUE ELSE FALSE END AS is_low
FROM public.materials m
CROSS JOIN public.plants p
LEFT JOIN public.inventory_transactions t
       ON t.material_id = m.id AND t.plant_id = p.id
GROUP BY m.id, m.code, m.name, p.id, p.code, m.reorder_level;

-- Scrap
CREATE TABLE public.scrap_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_no TEXT NOT NULL UNIQUE DEFAULT ('SCR-' || to_char(now(),'YYYYMMDDHH24MISSMS')),
  scrap_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  department_id UUID NOT NULL REFERENCES public.departments(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  reason TEXT,
  recovery_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  operator_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gap verification
CREATE TABLE public.gap_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verify_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plant_id UUID NOT NULL REFERENCES public.plants(id),
  material_id UUID NOT NULL REFERENCES public.materials(id),
  expected_consumption NUMERIC(16,4) NOT NULL DEFAULT 0,
  purchased_qty NUMERIC(16,4) NOT NULL DEFAULT 0,
  system_stock NUMERIC(16,4) NOT NULL DEFAULT 0,
  physical_stock NUMERIC(16,4) NOT NULL DEFAULT 0,
  allowed_wastage NUMERIC(16,4) NOT NULL DEFAULT 0,
  actual_gap NUMERIC(16,4) NOT NULL DEFAULT 0,
  difference NUMERIC(16,4) NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(verify_date, plant_id, material_id)
);

-- Audit log
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  detail JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- =========================================================
-- GRANTS
-- =========================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.plants, public.departments, public.suppliers, public.pipe_sizes,
  public.materials, public.products, public.production_entries,
  public.purchase_orders, public.inventory_transactions, public.scrap_entries,
  public.gap_verifications
TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.v_current_stock TO authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.plants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipe_sizes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_entries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_verifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_is_admin());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_is_admin());
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin() OR id = auth.uid());

-- user_roles: only admin manages
CREATE POLICY "roles_read_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Helper: any authenticated user reads masters & transactions; admins/managers write
CREATE POLICY "read_all_auth" ON public.plants      FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.plants      FOR ALL    TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "read_all_auth" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.departments FOR ALL    TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "read_all_auth" ON public.suppliers   FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.suppliers   FOR ALL    TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.pipe_sizes  FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.pipe_sizes  FOR ALL    TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "read_all_auth" ON public.materials   FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.materials   FOR ALL    TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "read_all_auth" ON public.products    FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_admin"   ON public.products    FOR ALL    TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.production_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_prod"    ON public.production_entries FOR ALL    TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','production_operator','store_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','production_operator','store_manager']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_purchase" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive','store_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive','store_manager']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_inv" ON public.inventory_transactions FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','production_manager','purchase_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','production_manager','purchase_manager']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.scrap_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_scrap" ON public.scrap_entries FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','store_manager','quality_manager']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','store_manager','quality_manager']::public.app_role[]));

CREATE POLICY "read_all_auth" ON public.gap_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_gap" ON public.gap_verifications FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','quality_manager','auditor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','quality_manager','auditor']::public.app_role[]));

CREATE POLICY "audit_read_admin" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','auditor']::public.app_role[]));
CREATE POLICY "audit_insert_any" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================================
-- BUSINESS-LOGIC TRIGGERS (the inventory engine)
-- =========================================================

-- Production entry: compute consumption & post inventory OUT on approval
CREATE OR REPLACE FUNCTION public.tg_production_calc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  SELECT total_meter, pipes_required_4m, pipes_required_6m, material_id
    INTO p FROM public.products WHERE id = NEW.product_id;
  NEW.meter_per_unit       := COALESCE(p.total_meter, 0);
  NEW.total_meter_consumed := ROUND((NEW.quantity * p.total_meter)::numeric, 4);
  NEW.pipes_consumed_4m    := ROUND((NEW.quantity * p.pipes_required_4m)::numeric, 4);
  NEW.pipes_consumed_6m    := ROUND((NEW.quantity * p.pipes_required_6m)::numeric, 4);
  NEW.material_id          := COALESCE(NEW.material_id, p.material_id);
  NEW.updated_at           := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_production_calc
BEFORE INSERT OR UPDATE ON public.production_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_production_calc();

CREATE OR REPLACE FUNCTION public.tg_production_post_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    INSERT INTO public.inventory_transactions
      (txn_date, material_id, plant_id, txn_type, qty_out, ref_table, ref_id, remarks)
    VALUES
      (now(), NEW.material_id, NEW.plant_id, 'production_out',
       NEW.total_meter_consumed, 'production_entries', NEW.id,
       'Auto: production ' || NEW.entry_no);
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_production_post_inv
BEFORE INSERT OR UPDATE ON public.production_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_production_post_inventory();

-- Purchase: total amount + pending qty + inventory IN on approval
CREATE OR REPLACE FUNCTION public.tg_purchase_calc()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.pending_qty  := GREATEST(NEW.quantity - COALESCE(NEW.received_qty,0), 0);
  NEW.total_amount := ROUND(((NEW.quantity * NEW.rate) * (1 + NEW.gst_pct/100.0) + COALESCE(NEW.transport,0))::numeric, 2);
  NEW.updated_at   := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_purchase_calc
BEFORE INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_calc();

CREATE OR REPLACE FUNCTION public.tg_purchase_post_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    INSERT INTO public.inventory_transactions
      (txn_date, material_id, plant_id, txn_type, qty_in, ref_table, ref_id, remarks)
    VALUES
      (now(), NEW.material_id, NEW.plant_id, 'purchase_in',
       COALESCE(NEW.received_qty, NEW.quantity), 'purchase_orders', NEW.id,
       'Auto: purchase ' || NEW.po_no);
    NEW.approved_at := COALESCE(NEW.approved_at, now());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_purchase_post_inv
BEFORE INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_purchase_post_inventory();

-- Scrap: auto OUT
CREATE OR REPLACE FUNCTION public.tg_scrap_post_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inventory_transactions
    (txn_date, material_id, plant_id, txn_type, qty_out, ref_table, ref_id, remarks)
  VALUES
    (now(), NEW.material_id, NEW.plant_id, 'scrap_out', NEW.quantity,
     'scrap_entries', NEW.id, 'Auto: scrap ' || NEW.scrap_no);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_scrap_post_inv
AFTER INSERT ON public.scrap_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_scrap_post_inventory();

-- Gap verification: auto compute fields when physical_stock given
CREATE OR REPLACE FUNCTION public.tg_gap_compute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected NUMERIC := 0;
  v_purchased NUMERIC := 0;
  v_system NUMERIC := 0;
  v_wpct NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(total_meter_consumed),0) INTO v_expected
    FROM public.production_entries
    WHERE plant_id = NEW.plant_id AND material_id = NEW.material_id
      AND entry_date <= NEW.verify_date AND status='approved';

  SELECT COALESCE(SUM(received_qty),0) INTO v_purchased
    FROM public.purchase_orders
    WHERE plant_id = NEW.plant_id AND material_id = NEW.material_id
      AND po_date <= NEW.verify_date AND status='approved';

  SELECT COALESCE(SUM(qty_in - qty_out),0) INTO v_system
    FROM public.inventory_transactions
    WHERE plant_id = NEW.plant_id AND material_id = NEW.material_id
      AND txn_date::date <= NEW.verify_date;

  SELECT COALESCE(allowed_wastage_pct,0) INTO v_wpct FROM public.materials WHERE id = NEW.material_id;

  NEW.expected_consumption := v_expected;
  NEW.purchased_qty        := v_purchased;
  NEW.system_stock         := v_system;
  NEW.allowed_wastage      := ROUND((v_expected * v_wpct / 100.0)::numeric, 4);
  NEW.difference           := ROUND((NEW.physical_stock - v_system)::numeric, 4);
  NEW.actual_gap           := ROUND((NEW.difference - NEW.allowed_wastage)::numeric, 4);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_gap_compute
BEFORE INSERT OR UPDATE ON public.gap_verifications
FOR EACH ROW EXECUTE FUNCTION public.tg_gap_compute();
