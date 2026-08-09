-- Palab — durcissement des fonctions, d'après l'audit Supabase.
--
-- 1. search_path figé partout. Sans cela, une fonction résout ses noms de
--    tables selon le search_path de l'appelant : quelqu'un capable de créer un
--    schéma pourrait lui faire viser ses propres tables.
--
-- 2. Les fonctions de trigger n'ont aucune raison d'être appelables en RPC via
--    l'API REST. Les triggers les exécutent indépendamment des droits de
--    l'appelant, on peut donc retirer EXECUTE sans rien casser.
--
-- Les quatre helpers utilisés dans les politiques RLS (is_admin,
-- current_agent_id, agent_owns_lady, can_access_conversation) gardent EXECUTE :
-- une politique s'évalue avec les droits de celui qui interroge, la révoquer
-- bloquerait tout accès. Chacun ne renvoie qu'une information sur l'appelant
-- lui-même, il n'y a donc rien à y gagner pour un curieux.

alter function public.set_updated_at()          set search_path = public;
alter function public.check_message_authorship() set search_path = public;
alter function public.safe_uuid(text)           set search_path = public;

revoke execute on function public.set_updated_at()           from anon, authenticated;
revoke execute on function public.check_message_authorship() from anon, authenticated;
revoke execute on function public.handle_new_user()          from anon, authenticated;
revoke execute on function public.touch_conversation()       from anon, authenticated;
revoke execute on function public.sync_lady_age()            from anon, authenticated;
revoke execute on function public.apply_credit_transaction() from anon, authenticated;
revoke execute on function public.guard_profile_role()       from anon, authenticated;
revoke execute on function public.guard_lady_admin_fields()  from anon, authenticated;
revoke execute on function public.guard_photo_status()       from anon, authenticated;
