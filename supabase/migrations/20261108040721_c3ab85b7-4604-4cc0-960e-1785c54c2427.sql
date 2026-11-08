CREATE TABLE public.customer_auth_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  mobile_number text NOT NULL,
  device_id text,
  device_name text,
  ip_address text,
  user_agent text,
  event_type text NOT NULL,
  is_suspicious boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_auth_audit_logs TO authenticated;
GRANT ALL ON public.customer_auth_audit_logs TO service_role;
ALTER TABLE public.customer_auth_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read auth audit" ON public.customer_auth_audit_logs FOR SELECT TO authenticated USING (public.is_super_admin());
CREATE INDEX idx_caal_created ON public.customer_auth_audit_logs (created_at DESC);
CREATE INDEX idx_caal_user ON public.customer_auth_audit_logs (user_id, device_id);
CREATE INDEX idx_caal_mobile ON public.customer_auth_audit_logs (mobile_number);