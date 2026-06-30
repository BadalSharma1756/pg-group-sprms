
-- Enforce plant-scope on all writes to operational tables.
DROP POLICY IF EXISTS write_prod ON public.production_entries;
CREATE POLICY write_prod ON public.production_entries FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','production_operator','store_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','production_operator','store_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  );

DROP POLICY IF EXISTS write_purchase ON public.purchase_orders;
CREATE POLICY write_purchase ON public.purchase_orders FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive','store_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','purchase_manager','purchase_executive','store_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  );

DROP POLICY IF EXISTS write_inv ON public.inventory_transactions;
CREATE POLICY write_inv ON public.inventory_transactions FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','production_manager','purchase_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','production_manager','purchase_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  );

DROP POLICY IF EXISTS write_scrap ON public.scrap_entries;
CREATE POLICY write_scrap ON public.scrap_entries FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','store_manager','quality_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','production_manager','store_manager','quality_manager']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  );

DROP POLICY IF EXISTS write_gap ON public.gap_verifications;
CREATE POLICY write_gap ON public.gap_verifications FOR ALL
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','quality_manager','auditor']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['super_admin','plant_admin','store_manager','quality_manager','auditor']::public.app_role[])
    AND public.user_can_access_plant(auth.uid(), plant_id)
  );

-- Harden auth_events: explicitly block anon inserts and constrain authenticated
-- self-inserts to a small allowlist of post-sign-in event types. Pre-auth
-- writes (otp_sent, otp_failed, lockout, etc.) must go through the
-- service-role server functions only.
DROP POLICY IF EXISTS "auth_events self insert" ON public.auth_events;
CREATE POLICY "auth_events self insert" ON public.auth_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND user_id = auth.uid()
    AND event_type IN ('otp_verified','resend_otp','signin','signout')
  );

REVOKE INSERT ON public.auth_events FROM anon;
