-- Réponse automatique, conversation par conversation.
--
-- L'assistant cesse d'être un bouton : quand l'agent l'a activé, l'IA répond
-- d'elle-même aux messages restés sans réponse au bout de quelques secondes.
-- L'agent garde deux manettes — un interrupteur par conversation, et des
-- consignes propres à celle-ci qui s'ajoutent à ses consignes générales.
--
-- Activé par défaut : il n'y a pas de ligne à créer pour qu'une conversation
-- soit prise en charge, l'absence de ligne vaut « oui ». C'est ce que veut
-- l'agent qui a posé sa clé — il l'a fait pour ne pas laisser un premier
-- message attendre, pas pour devoir armer chaque fil à la main.
--
-- Rien de tout cela ne s'applique à un agent qui n'a pas activé son assistant :
-- sans clé et sans `agent_ia.actif`, aucune conversation n'est candidate.

create table public.conversation_ia (
  conversation_id    uuid primary key references public.conversations(id) on delete cascade,
  actif              boolean not null default true,
  -- S'ajoutent aux consignes générales de l'agent, pour ce fil seulement.
  consignes          text,
  -- Dernier essai, réussi ou non : sert de temporisation quand OpenAI refuse.
  derniere_tentative timestamptz,
  updated_at         timestamptz not null default now()
);

create trigger conversation_ia_updated_at
  before update on public.conversation_ia
  for each row execute function public.set_updated_at();

alter table public.conversation_ia enable row level security;

-- L'agent règle les conversations de son portefeuille, et rien d'autre.
create policy conversation_ia_agent on public.conversation_ia
  for all to authenticated
  using (public.can_access_conversation(conversation_id))
  with check (public.can_access_conversation(conversation_id));

create policy conversation_ia_admin on public.conversation_ia
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Délai avant que l'IA ne réponde. Assez pour ne pas répondre à la seconde —
-- une réponse instantanée se remarque — assez peu pour que le membre ne parte
-- pas entre-temps.
insert into public.tarifs (code, montant, libelle) values
  ('ia_delai_secondes', 25, 'Secondes avant réponse automatique de l''IA')
on conflict (code) do nothing;

/**
 * Conversations qui attendent une réponse de l'IA.
 *
 * L'état est déduit des messages plutôt que tenu dans une file : une file se
 * désynchronise — un message inséré par un autre chemin, une reprise manuelle
 * de l'agent, une panne au milieu — et il faut ensuite la réparer. Ici, la
 * question « ce fil attend-il une réponse ? » se repose entièrement à chaque
 * passage, et la réponse est toujours juste.
 *
 * Un fil dont le dernier message vient de la femme n'est jamais candidat :
 * c'est ce qui fait que l'IA ne parle pas toute seule, et que la reprise de
 * l'agent l'arrête sans qu'on ait à la prévenir.
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
      (select montant from public.tarifs where code = 'ia_delai_secondes'), 25
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
     -- Temporisation après un échec : inutile de rappeler OpenAI toutes les
     -- minutes quand une clé est morte ou un crédit épuisé.
     and (ci.derniere_tentative is null or ci.derniere_tentative < now() - interval '5 minutes')
   order by d.created_at
   limit p_limite;
$$;

revoke all on function public.conversations_pour_ia(integer) from public;

-- Marque l'essai avant de partir chez OpenAI, pas après : si l'appel échoue à
-- mi-chemin ou n'en revient jamais, la temporisation joue quand même.
create or replace function public.marquer_tentative_ia(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.conversation_ia (conversation_id, derniere_tentative)
  values (p_conversation_id, now())
  on conflict (conversation_id) do update set derniere_tentative = now();
$$;

revoke all on function public.marquer_tentative_ia(uuid) from public;

-- ------------------------------------------------------------------ cadencement
--
-- Postgres ne sait pas appeler OpenAI : le déchiffrement de la clé et l'appel
-- vivent dans l'application. La base se contente de réveiller une adresse
-- quand il y a du travail — et seulement à ce moment-là : réveiller à vide
-- toutes les minutes consommerait des invocations d'hébergement pour rien.
--
-- La planification n'est pas dans cette migration : elle porte un secret, et
-- un secret n'a pas sa place dans un dépôt. À exécuter une fois dans l'éditeur
-- SQL de Supabase, en remplaçant les deux valeurs :
--
--   create extension if not exists pg_net with schema extensions;
--
--   create or replace function public.declencher_ia()
--   returns void language plpgsql security definer set search_path = public, extensions as $fn$
--   begin
--     if not exists (select 1 from public.conversations_pour_ia(1)) then
--       return;
--     end if;
--     perform net.http_post(
--       url     := 'https://www.palab.love/api/ia/repondre',
--       headers := jsonb_build_object(
--                    'Content-Type', 'application/json',
--                    'Authorization', 'Bearer VOTRE_SECRET'),
--       body    := '{}'::jsonb
--     );
--   end $fn$;
--
--   select cron.schedule('ia-reponses', '30 seconds',
--                        $cron$select public.declencher_ia();$cron$);
--
-- `VOTRE_SECRET` doit être identique à la variable IA_WORKER_SECRET posée côté
-- hébergement, et l'adresse doit être celle du domaine approuvé.
