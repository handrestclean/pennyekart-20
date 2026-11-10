CREATE OR REPLACE FUNCTION public.admin_get_community_pending_invites(_community_id uuid)
RETURNS TABLE(invite_id uuid, invited_mobile text, invited_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.invited_mobile, p.full_name, i.created_at
  FROM public.community_invites i
  LEFT JOIN public.profiles p ON p.user_id = i.invited_user_id
  WHERE i.community_id = _community_id AND i.status = 'pending'
    AND (public.is_super_admin() OR public.has_permission('read_users'))
  ORDER BY i.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_get_community_pending_invites(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_get_community_pending_invites(uuid) TO authenticated;