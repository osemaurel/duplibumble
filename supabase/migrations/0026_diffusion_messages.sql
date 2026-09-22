-- Diffusion des messages en direct — la bonne méthode, cette fois.
--
-- La migration 0009 ouvrait la réplication (`postgres_changes`) et croyait
-- l'affaire réglée. Elle ne l'était pas : sur ce projet, aucun événement n'est
-- jamais parvenu au navigateur. Vérifié hors navigateur, avec un vrai compte :
-- l'abonnement se déclare bien « SUBSCRIBED », la publication contient la
-- table, le RLS laisse passer l'agent, son jeton est posé sur la connexion —
-- et rien n'arrive. Un message n'apparaissait donc qu'au rechargement de la
-- page, ce qui d'une messagerie fait une boîte aux lettres.
--
-- La diffusion directe, elle, fonctionne : vérifiée entre deux clients, le
-- message passe. C'est d'ailleurs la voie que Supabase recommande désormais.
-- On ne dépend plus de la réplication : c'est la base qui pousse elle-même,
-- par un déclencheur.
--
-- Le canal est privé. Un canal public nommé d'après l'identifiant de la
-- conversation aurait « suffi » — encore faut-il connaître l'identifiant — mais
-- faire reposer la confidentialité de messages intimes sur le fait qu'un UUID
-- ne se devine pas n'est pas une garantie, c'est un pari. L'accès au canal est
-- donc soumis au même droit que la conversation elle-même.

-- Qui peut écouter un fil : exactement qui peut le lire. `can_access_conversation`
-- est déjà l'arbitre pour la table `messages` ; le canal suit la même règle,
-- et il n'y a ainsi qu'un seul endroit où se trompe.
create policy "participants ecoutent leur fil"
  on realtime.messages for select to authenticated
  using (
    realtime.topic() like 'conversation:%'
    and public.can_access_conversation(
      public.safe_uuid(split_part(realtime.topic(), ':', 2))
    )
  );

-- Et qui peut émettre sur ce canal : les mêmes. Nécessaire pour l'indicateur
-- de saisie, qui part du navigateur et ne passe par aucune table.
create policy "participants emettent sur leur fil"
  on realtime.messages for insert to authenticated
  with check (
    realtime.topic() like 'conversation:%'
    and public.can_access_conversation(
      public.safe_uuid(split_part(realtime.topic(), ':', 2))
    )
  );

/**
 * Pousse chaque nouveau message vers le canal de sa conversation.
 *
 * Le déclencheur porte la charge utile complète : le client affiche la bulle
 * sans avoir à retourner interroger la base, et le fil se remplit à l'instant
 * où le message est écrit, quelle que soit la façon dont il est arrivé —
 * membre, agent, ou assistant automatique.
 */
create or replace function public.diffuser_message()
returns trigger
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'id',              new.id,
      'conversation_id', new.conversation_id,
      'sender',          new.sender,
      'body',            new.body,
      'attachment_path', new.attachment_path,
      'gift_code',       new.gift_code,
      'created_at',      new.created_at
    ),
    'nouveau-message',
    'conversation:' || new.conversation_id,
    true
  );
  return null;
end $$;

create trigger messages_diffusion
  after insert on public.messages
  for each row execute function public.diffuser_message();

-- La réplication n'a plus lieu d'être : elle ne servait rien et faisait
-- circuler chaque ligne pour personne.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime drop table public.messages;
  end if;

  if exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime drop table public.conversations;
  end if;
end $$;
