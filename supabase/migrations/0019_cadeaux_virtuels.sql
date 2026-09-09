-- Cadeaux virtuels : un geste payant dans une conversation, distinct du
-- message classique.
--
-- Le catalogue vit en base, comme les tarifs et les paliers de recharge : la
-- fonction d'envoi doit connaître le prix sans que le client le lui souffle.
-- Le cadeau ne donne lieu à aucune expédition ni contrepartie réelle — c'est
-- un geste symbolique affiché dans le fil de discussion, réglé en crédits.

create table public.gift_catalog (
  code     text primary key,
  category text not null,
  libelle  text not null,
  emoji    text not null,
  cost     integer not null check (cost > 0),
  ordre    integer not null default 0,
  actif    boolean not null default true
);

comment on table public.gift_catalog is
  'Cadeaux virtuels envoyables dans une conversation. Purement symbolique :
   aucune expédition, aucune contrepartie réelle. Le prix ne se recopie jamais
   dans le code — envoyer_cadeau_membre le relit ici à chaque envoi.';

insert into public.gift_catalog (code, category, libelle, emoji, cost, ordre) values
  ('coucou',         'Mots doux', 'Coucou',                 '👋', 4,   1),
  ('bonjour',        'Mots doux', 'Bonjour !',               '☀️', 5,   2),
  ('bonne_nuit',     'Mots doux', 'Bonne nuit',              '🌙', 5,   3),
  ('bravo',          'Mots doux', 'Bravo !',                 '🎉', 6,   4),
  ('tu_me_manques',  'Mots doux', 'Tu me manques',           '💭', 8,   5),
  ('lettre',         'Mots doux', 'Lettre d''amour',         '💌', 15,  6),
  ('je_taime',       'Mots doux', 'Je t''aime',              '❤️', 12,  7),

  ('rose',           'Fleurs',    'Une rose',                '🌹', 10,  10),
  ('tulipes',        'Fleurs',    'Tulipes',                 '🌷', 18,  11),
  ('bouquet',        'Fleurs',    'Bouquet de roses',        '💐', 25,  12),
  ('orchidee',       'Fleurs',    'Orchidée',                '🪷', 30,  13),

  ('fraises',        'Gourmand',  'Fraises à la crème',      '🍓', 12,  20),
  ('chocolat',       'Gourmand',  'Boîte de chocolats',      '🍫', 14,  21),
  ('gateau',         'Gourmand',  'Gâteau',                  '🍰', 16,  22),
  ('champagne',      'Gourmand',  'Champagne',               '🍾', 35,  23),

  ('ballon',         'Loisirs',   'Ballon de fête',          '🎈', 6,   30),
  ('musique',        'Loisirs',   'Sérénade',                '🎵', 20,  31),
  ('nounours',       'Loisirs',   'Nounours',                '🧸', 20,  32),
  ('voyage',         'Loisirs',   'Séjour de rêve',          '✈️', 180, 33),

  ('bougie',         'Romantique','Dîner aux chandelles',    '🕯️', 40,  40),
  ('coeur_cristal',  'Romantique','Cœur en cristal',         '💎', 45,  41),
  ('parfum',         'Romantique','Parfum',                  '🌸', 55,  42),

  ('montre',         'Luxe',      'Montre',                  '⌚', 90,  50),
  ('bague',          'Luxe',      'Bague',                   '💍', 120, 51),
  ('couronne',       'Luxe',      'Couronne royale',         '👑', 150, 52),
  ('diamant',        'Luxe',      'Diamant',                 '💠', 200, 53),
  ('voiture',        'Luxe',      'Voiture de sport',        '🏎️', 250, 54)
on conflict (code) do update
  set category = excluded.category,
      libelle  = excluded.libelle,
      emoji    = excluded.emoji,
      cost     = excluded.cost,
      ordre    = excluded.ordre;

alter table public.gift_catalog enable row level security;

-- Public : le catalogue s'affiche avant même de créer un compte, comme le
-- barème et les paliers.
create policy gift_catalog_lecture on public.gift_catalog
  for select to anon, authenticated using (actif);

create policy gift_catalog_admin on public.gift_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Le message porte le cadeau : c'est ainsi qu'il apparaît dans le fil, au bon
-- endroit chronologiquement, sans écran ni table séparés.
alter table public.messages
  add column gift_code text references public.gift_catalog(code);

create or replace function public.envoyer_cadeau_membre(
  p_conversation_id uuid,
  p_gift_code       text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membre  uuid := auth.uid();
  v_cadeau  record;
  v_solde   integer;
  v_message uuid;
begin
  if v_membre is null then
    raise exception 'AUTHENTIFICATION_REQUISE' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.conversations c
     where c.id = p_conversation_id and c.member_id = v_membre
  ) then
    raise exception 'CONVERSATION_INTROUVABLE' using errcode = '42501';
  end if;

  select code, libelle, emoji, cost into v_cadeau
    from public.gift_catalog
   where code = p_gift_code and actif;

  if v_cadeau.code is null then
    raise exception 'CADEAU_INTROUVABLE' using errcode = 'P0001';
  end if;

  -- Même verrou que pour un message : deux envois simultanés ne doivent pas
  -- passer tous deux devant un solde qui ne suffit qu'à l'un des deux.
  select balance into v_solde
    from public.credit_balances
   where member_id = v_membre
     for update;

  if coalesce(v_solde, 0) < v_cadeau.cost then
    raise exception 'CREDITS_INSUFFISANTS' using errcode = 'P0001';
  end if;

  insert into public.messages
    (conversation_id, sender, sender_profile_id, body, gift_code)
  values
    (p_conversation_id, 'member', v_membre, v_cadeau.emoji || ' ' || v_cadeau.libelle, v_cadeau.code)
  returning id into v_message;

  insert into public.credit_transactions (member_id, amount, reason, message_id)
  values (v_membre, -v_cadeau.cost, 'gift', v_message);

  return v_message;
end $$;

revoke all on function public.envoyer_cadeau_membre(uuid, text) from public;
grant execute on function public.envoyer_cadeau_membre(uuid, text) to authenticated;
