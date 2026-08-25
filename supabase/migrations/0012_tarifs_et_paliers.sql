-- Barème et paliers de recharge, en base plutôt qu'en dur dans le code.
--
-- La raison n'est pas le confort : la fonction d'envoi doit connaître le prix
-- sans que le client le lui souffle. Si le coût transitait par un paramètre,
-- n'importe qui pourrait appeler la fonction en annonçant zéro.

create table if not exists public.tarifs (
  code        text primary key,
  montant     integer not null check (montant >= 0),
  libelle     text not null,
  updated_at  timestamptz not null default now()
);

comment on table public.tarifs is
  'Coût en crédits de chaque action. Source unique : la fonction d''envoi et
   l''affichage lisent la même ligne.';

insert into public.tarifs (code, montant, libelle) values
  ('message',          1,  'Message envoyé'),
  ('photo',            2,  'Photo envoyée'),
  ('video_minute',     4,  'Minute de vidéo'),
  ('bonus_bienvenue', 10,  'Crédits offerts à l''inscription'),
  ('jours_remboursement', 7, 'Jours sans réponse avant remboursement')
on conflict (code) do update
  set montant = excluded.montant,
      libelle = excluded.libelle,
      updated_at = now();

create table if not exists public.paliers_credits (
  code          text primary key,
  libelle       text not null,
  credits       integer not null check (credits > 0),
  -- En centimes : un prix ne se stocke jamais en nombre à virgule flottante.
  prix_cents    integer not null check (prix_cents > 0),
  devise        text not null default 'EUR',
  ordre         integer not null,
  mis_en_avant  boolean not null default false,
  actif         boolean not null default true
);

comment on table public.paliers_credits is
  'Paliers de recharge affichés au membre. Prix TTC en centimes d''euro.';

insert into public.paliers_credits (code, libelle, credits, prix_cents, ordre, mis_en_avant) values
  ('decouverte', 'Découverte',   20,   999, 1, false),
  ('regulier',   'Régulier',     60,  2699, 2, false),
  ('populaire',  'Populaire',   150,  5999, 3, true),
  ('intensif',   'Intensif',    400, 13999, 4, false),
  ('grand',      'Grand',      1000, 29999, 5, false)
on conflict (code) do update
  set libelle = excluded.libelle,
      credits = excluded.credits,
      prix_cents = excluded.prix_cents,
      ordre = excluded.ordre,
      mis_en_avant = excluded.mis_en_avant;

alter table public.tarifs enable row level security;
alter table public.paliers_credits enable row level security;

-- Le barème est public : il doit s'afficher avant même de créer un compte.
drop policy if exists tarifs_lecture on public.tarifs;
create policy tarifs_lecture on public.tarifs for select to anon, authenticated using (true);

drop policy if exists tarifs_admin on public.tarifs;
create policy tarifs_admin on public.tarifs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists paliers_lecture on public.paliers_credits;
create policy paliers_lecture on public.paliers_credits for select to anon, authenticated using (actif);

drop policy if exists paliers_admin on public.paliers_credits;
create policy paliers_admin on public.paliers_credits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
