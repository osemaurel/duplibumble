-- Palab — diffusion en direct des messages.
--
-- Sans cela, un message n'apparaît qu'au rechargement de la page : la
-- conversation ressemble à une boîte aux lettres, pas à une messagerie.
--
-- Le RLS s'applique aussi aux abonnements : chacun ne reçoit que ce qu'il a
-- déjà le droit de lire. Ouvrir la diffusion n'ouvre donc aucune donnée.
--
-- REPLICA IDENTITY FULL est nécessaire pour que les mises à jour et
-- suppressions transportent la ligne complète ; sans elle, seul l'identifiant
-- circule et le client ne peut pas savoir de quelle conversation il s'agit.

alter table public.messages      replica identity full;
alter table public.conversations replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
