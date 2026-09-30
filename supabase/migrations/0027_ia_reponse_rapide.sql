-- Réponse de l'IA : en quelques secondes, et des points de saisie pendant.
--
-- Mesuré sur les réponses déjà parties en production, avant ce correctif :
-- deux familles nettes. Une trentaine à une cinquantaine de secondes d'un
-- côté, deux à cinq minutes de l'autre. La seconde famille n'était pas une
-- lenteur d'OpenAI, c'était une règle que j'avais écrite de travers.
--
-- `conversations_pour_ia` écartait toute conversation dont le dernier essai
-- datait de moins de cinq minutes. La temporisation était pensée pour les
-- échecs — ne pas rappeler OpenAI en boucle quand une clé est morte. Mais elle
-- s'appliquait aussi aux réussites : dès que l'IA avait répondu une fois, le
-- message suivant du membre attendait la fin des cinq minutes. Autrement dit,
-- plus la conversation était vivante, plus elle était lente. Exactement
-- l'inverse de ce qu'il faut.
--
-- Cette migration pose trois choses :
--
--   1. une réservation atomique, pour que la voie immédiate (déclenchée par
--      l'envoi du membre) et la voie de secours (pg_cron) ne puissent pas
--      répondre toutes les deux ;
--   2. une libération après une réponse réussie, pour que la temporisation ne
--      pèse plus que sur les échecs ;
--   3. la diffusion des points de saisie, pour que le membre voie qu'on lui
--      écrit au lieu de fixer un écran vide.

-- Le délai n'est plus une attente avant de commencer, mais la durée minimale
-- pendant laquelle les points restent visibles. Le membre doit voir qu'on lui
-- répond ; il n'a pas à attendre pour le plaisir de l'attente.
update public.tarifs
   set montant = 4,
       libelle = 'Secondes minimales avant la réponse de l''IA (points de saisie)'
 where code = 'ia_delai_secondes';

/**
 * Réserve une conversation pour un seul répondeur.
 *
 * Rend vrai à celui qui obtient la réservation, faux aux autres. Tout tient
 * dans la clause `where` du `on conflict` : Postgres verrouille la ligne, le
 * second arrivant la relit une fois le premier passé, et repart les mains
 * vides. Sans cela, l'envoi du membre et le réveil planifié pourraient partir
 * ensemble et faire répondre deux fois — ce qui se remarque immédiatement.
 *
 * Le verrou est large parce qu'il couvre un appel à un tiers : mieux vaut
 * qu'une conversation attende le passage suivant que de voir arriver deux
 * messages là où un seul était voulu.
 */
create or replace function public.reclamer_conversation_ia(
  p_conversation_id uuid,
  p_verrou_secondes integer default 90
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obtenue boolean;
begin
  insert into public.conversation_ia as ci (conversation_id, derniere_tentative)
  values (p_conversation_id, now())
  on conflict (conversation_id) do update
     set derniere_tentative = now()
   where ci.derniere_tentative is null
      or ci.derniere_tentative < now() - make_interval(secs => p_verrou_secondes)
  returning true into v_obtenue;

  return coalesce(v_obtenue, false);
end;
$$;

revoke all on function public.reclamer_conversation_ia(uuid, integer) from public;

/**
 * Lève la réservation après une réponse effectivement envoyée.
 *
 * C'est ce qui rend la conversation vive : le message suivant du membre
 * repart aussitôt, sans attendre la fin d'un verrou dont la réponse a déjà
 * prouvé qu'il n'avait plus lieu d'être. Rien ne risque de repartir en
 * boucle pour autant — une conversation dont le dernier message vient de la
 * femme n'est jamais candidate.
 */
create or replace function public.liberer_conversation_ia(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_ia
     set derniere_tentative = null
   where conversation_id = p_conversation_id;
$$;

revoke all on function public.liberer_conversation_ia(uuid) from public;

/**
 * L'agent dont l'assistant prend en charge cette conversation, s'il y en a un.
 *
 * Mêmes conditions que `conversations_pour_ia`, moins le délai : la voie
 * immédiate sait déjà qu'un message vient d'arriver. Sert à ne pas réserver —
 * ni créer de ligne — pour une conversation qu'aucune IA ne suit.
 */
create or replace function public.agent_ia_de_la_conversation(p_conversation_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.agent_id
    from public.conversations c
    join public.ladies l    on l.id = c.lady_id
    join public.agent_ia ia on ia.agent_id = l.agent_id
    left join public.conversation_ia ci on ci.conversation_id = c.id
   where c.id = p_conversation_id
     and ia.actif
     and ia.cle_chiffree is not null
     and coalesce(ci.actif, true);
$$;

revoke all on function public.agent_ia_de_la_conversation(uuid) from public;

/**
 * Points de saisie diffusés depuis le serveur.
 *
 * Le navigateur signale déjà la frappe d'une personne. L'IA, elle, n'a pas de
 * navigateur : sans ceci, le membre voit un écran immobile puis un message qui
 * tombe du ciel. Le canal et l'événement sont exactement ceux qu'écoutent déjà
 * la conversation et la liste des messages — rien de neuf côté client.
 */
create or replace function public.diffuser_saisie(
  p_conversation_id uuid,
  p_cote text default 'lady'
)
returns void
language plpgsql
security definer
set search_path = public, realtime
as $$
begin
  perform realtime.send(
    jsonb_build_object('cote', p_cote),
    'saisie',
    'conversation:' || p_conversation_id,
    true
  );
end;
$$;

revoke all on function public.diffuser_saisie(uuid, text) from public;

/**
 * Conversations qui attendent une réponse de l'IA.
 *
 * Reprise de la 0025, avec la temporisation remise à sa place : elle ne vaut
 * que pour un essai resté sans réponse. Un message arrivé *après* le dernier
 * essai n'est plus retenu — c'est un tour de parole neuf, pas une reprise.
 *
 * Cette voie n'est plus la voie normale : l'envoi du membre déclenche la
 * réponse directement. Elle reste le filet — un redémarrage au mauvais moment,
 * un message inséré par un autre chemin, un appel qui n'est jamais revenu.
 */
create or replace function public.conversations_pour_ia(p_limite integer default 10)
returns table (conversation_id uuid, agent_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with reglage as (
    select coalesce(
      (select montant from public.tarifs where code = 'ia_delai_secondes'), 4
    ) as delai
  ),
  dernier as (
    select distinct on (m.conversation_id)
           m.conversation_id,
           m.sender,
           m.created_at
      from public.messages m
     order by m.conversation_id, m.created_at desc
  )
  select c.id, l.agent_id
    from public.conversations c
    join public.ladies l    on l.id = c.lady_id
    join public.agent_ia ia on ia.agent_id = l.agent_id
    join dernier d          on d.conversation_id = c.id
    left join public.conversation_ia ci on ci.conversation_id = c.id
   cross join reglage r
   where ia.actif
     and ia.cle_chiffree is not null
     -- Pas de ligne vaut « activé » : l'IA prend en charge sans qu'on l'arme.
     and coalesce(ci.actif, true)
     and d.sender = 'member'
     and d.created_at < now() - make_interval(secs => r.delai)
     and (
       ci.derniere_tentative is null
       -- Le membre a reparlé depuis le dernier essai : tour de parole neuf.
       or ci.derniere_tentative < d.created_at
       -- Sinon, c'est un essai qui n'a rien donné. Deux minutes suffisent :
       -- cinq faisaient de la temporisation la première cause de lenteur.
       or ci.derniere_tentative < now() - interval '2 minutes'
     )
   order by d.created_at
   limit p_limite;
$$;

revoke all on function public.conversations_pour_ia(integer) from public;

-- `marquer_tentative_ia` de la 0025 n'est plus appelée — `reclamer_conversation_ia`
-- fait le même travail en disant si la réservation a été obtenue. Elle reste
-- en place le temps d'un déploiement : la migration s'applique avant que le
-- code ne parte, et la version encore en ligne l'appelle jusque-là.
comment on function public.marquer_tentative_ia(uuid) is
  'Remplacée par reclamer_conversation_ia. Conservée pour le temps du déploiement.';
