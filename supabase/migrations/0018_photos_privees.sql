-- Photos privées : au-delà de la vitrine, quelques clichés réservés aux
-- membres qui les débloquent avec des crédits.
--
-- Le flou n'est jamais une affaire de style : une classe CSS se contourne
-- depuis les outils du navigateur, et l'original transiterait quand même sur
-- le réseau. Ici la route qui sert la photo décide seule, côté serveur, quels
-- octets partent — flous pour qui n'a pas payé, intacts pour qui a payé.
-- Cette migration ne pose que le schéma ; le flou lui-même vit dans la route.

alter table public.lady_photos
  add column is_private  boolean not null default false,
  add column unlock_cost integer;

alter table public.lady_photos
  add constraint lady_photos_unlock_cost_positif
    check (not is_private or unlock_cost > 0);

alter type public.credit_reason add value if not exists 'photo_unlock';

-- Preuve qu'un membre a payé pour voir une photo précise. Une ligne par
-- couple (membre, photo) : redemander la même photo ne redébite pas.
create table public.photo_unlocks (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid not null references public.profiles(id) on delete cascade,
  photo_id       uuid not null references public.lady_photos(id) on delete cascade,
  transaction_id uuid references public.credit_transactions(id) on delete set null,
  created_at     timestamptz not null default now(),

  unique (member_id, photo_id)
);

create index photo_unlocks_photo_idx on public.photo_unlocks (photo_id);

alter table public.photo_unlocks enable row level security;

create policy photo_unlocks_select_own on public.photo_unlocks
  for select to authenticated using (member_id = auth.uid());

-- Un agent voit qui a débloqué les photos des femmes qu'il représente : un
-- indicateur d'intérêt pour son portefeuille, pas un relevé d'argent — la
-- monétisation de l'agent reste hors sujet pour l'instant.
create policy photo_unlocks_select_agent on public.photo_unlocks
  for select to authenticated using (
    exists (
      select 1 from public.lady_photos p
       where p.id = public.photo_unlocks.photo_id
         and public.agent_owns_lady(p.lady_id)
    )
  );

create policy photo_unlocks_admin on public.photo_unlocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Débloque une photo privée pour le membre courant. Débit et preuve de
-- déblocage réussissent ou échouent ensemble, comme pour l'envoi d'un message
-- (cf. envoyer_message_membre) : jamais l'un sans l'autre.
create or replace function public.debloquer_photo(p_photo_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membre      uuid := auth.uid();
  v_photo       record;
  v_solde       integer;
  v_transaction uuid;
begin
  if v_membre is null then
    raise exception 'AUTHENTIFICATION_REQUISE' using errcode = '42501';
  end if;

  select p.id, p.is_private, p.unlock_cost, p.status, l.status as lady_status
    into v_photo
    from public.lady_photos p
    join public.ladies l on l.id = p.lady_id
   where p.id = p_photo_id
     for update of p;

  if v_photo.id is null or v_photo.status <> 'approved' or v_photo.lady_status <> 'published' then
    raise exception 'PHOTO_INTROUVABLE' using errcode = 'P0001';
  end if;

  if not v_photo.is_private then
    raise exception 'PHOTO_DEJA_PUBLIQUE' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.photo_unlocks
     where member_id = v_membre and photo_id = p_photo_id
  ) then
    -- Déjà payée : on renvoie la transaction d'origine plutôt que d'échouer,
    -- un second clic sur le même bouton ne doit jamais redébiter.
    select transaction_id into v_transaction
      from public.photo_unlocks
     where member_id = v_membre and photo_id = p_photo_id;
    return v_transaction;
  end if;

  select balance into v_solde
    from public.credit_balances
   where member_id = v_membre
     for update;

  if coalesce(v_solde, 0) < v_photo.unlock_cost then
    raise exception 'CREDITS_INSUFFISANTS' using errcode = 'P0001';
  end if;

  insert into public.credit_transactions (member_id, amount, reason)
  values (v_membre, -v_photo.unlock_cost, 'photo_unlock')
  returning id into v_transaction;

  insert into public.photo_unlocks (member_id, photo_id, transaction_id)
  values (v_membre, p_photo_id, v_transaction);

  return v_transaction;
end $$;

revoke all on function public.debloquer_photo(uuid) from public;
grant execute on function public.debloquer_photo(uuid) to authenticated;
