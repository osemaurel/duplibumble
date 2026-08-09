-- Palab — retrait du droit d'exécution hérité de PUBLIC.
--
-- Postgres accorde EXECUTE à PUBLIC sur toute fonction nouvellement créée.
-- Révoquer sur anon et authenticated ne suffit donc pas : ces rôles conservent
-- le droit par héritage, et les fonctions restent appelables via
-- /rest/v1/rpc/. C'est PUBLIC qu'il faut viser.
--
-- Les fonctions de trigger perdent tout droit d'appel direct. Les quatre
-- helpers utilisés dans les politiques RLS le reçoivent explicitement, puisque
-- l'évaluation d'une politique s'effectue avec les droits de celui qui
-- interroge.

revoke execute on function public.set_updated_at()           from public;
revoke execute on function public.check_message_authorship() from public;
revoke execute on function public.handle_new_user()          from public;
revoke execute on function public.touch_conversation()       from public;
revoke execute on function public.sync_lady_age()            from public;
revoke execute on function public.apply_credit_transaction() from public;
revoke execute on function public.guard_profile_role()       from public;
revoke execute on function public.guard_lady_admin_fields()  from public;
revoke execute on function public.guard_photo_status()       from public;
revoke execute on function public.safe_uuid(text)            from public;

revoke execute on function public.is_admin()                       from public;
revoke execute on function public.current_agent_id()               from public;
revoke execute on function public.agent_owns_lady(uuid)            from public;
revoke execute on function public.can_access_conversation(uuid)    from public;

grant execute on function public.is_admin()                    to anon, authenticated;
grant execute on function public.current_agent_id()            to anon, authenticated;
grant execute on function public.agent_owns_lady(uuid)         to anon, authenticated;
grant execute on function public.can_access_conversation(uuid) to anon, authenticated;

-- safe_uuid est appelée dans les politiques du stockage : elle doit rester
-- exécutable par les rôles concernés.
grant execute on function public.safe_uuid(text) to anon, authenticated;
