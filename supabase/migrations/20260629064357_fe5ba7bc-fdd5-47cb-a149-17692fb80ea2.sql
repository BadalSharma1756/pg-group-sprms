
-- 1) locations
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  region text,
  status entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc_read" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "loc_write" ON public.locations FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE TRIGGER trg_loc_upd BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) plants.location_id
ALTER TABLE public.plants ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);

-- 3) profiles scope columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS default_plant_id uuid REFERENCES public.plants(id);

-- 4) user_plants (many-to-many access grants)
CREATE TABLE public.user_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plant_id uuid NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plant_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_plants TO authenticated;
GRANT ALL ON public.user_plants TO service_role;
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up_self_read" ON public.user_plants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());
CREATE POLICY "up_admin_write" ON public.user_plants FOR ALL TO authenticated
  USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- 5) helper: returns true if user can access this plant
CREATE OR REPLACE FUNCTION public.user_can_access_plant(_user_id uuid, _plant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    _plant_id IS NULL
    OR public.has_any_role(_user_id, ARRAY['super_admin','plant_admin']::public.app_role[])
    OR EXISTS (SELECT 1 FROM public.user_plants WHERE user_id=_user_id AND plant_id=_plant_id)
$$;

-- 6) scope read policies on transactional tables (replace permissive read)
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['production_entries','purchase_orders','inventory_transactions','gap_verifications','scrap_entries']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS read_all_auth ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "read_scope" ON public.%I FOR SELECT TO authenticated
                     USING (public.user_can_access_plant(auth.uid(), plant_id))$p$, t);
  END LOOP;
END $$;

-- 7) seed locations + plants
INSERT INTO public.locations(code,name,region) VALUES
  ('PUNE','Pune','Maharashtra'),
  ('BWD','Bhiwadi','Rajasthan')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plants(code,name,location,location_id) VALUES
  ('NGM','NGM','Pune', (SELECT id FROM public.locations WHERE code='PUNE')),
  ('PGTL','PGTL','Pune', (SELECT id FROM public.locations WHERE code='PUNE')),
  ('4020','NGM (Bhiwadi)','Bhiwadi', (SELECT id FROM public.locations WHERE code='BWD')),
  ('2040','PGTL (Bhiwadi)','Bhiwadi', (SELECT id FROM public.locations WHERE code='BWD'))
ON CONFLICT (code) DO UPDATE SET location_id = EXCLUDED.location_id;
