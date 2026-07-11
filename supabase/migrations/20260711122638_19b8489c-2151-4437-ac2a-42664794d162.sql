DROP POLICY IF EXISTS "app_config readable by all" ON public.app_config;
REVOKE SELECT ON public.app_config FROM anon, authenticated;
CREATE POLICY "app_config readable by admin" ON public.app_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.app_config TO authenticated;