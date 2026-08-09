-- Palab — socle : rôles, agents, femmes représentées, photos.
--
-- Les champs internes d'une femme (identité légale, pièce, contrat) vivent dans
-- une table séparée `lady_private`. C'est ce qui permet d'ouvrir la lecture de
-- `ladies` au public sans jamais exposer une donnée confidentielle : la
-- séparation est physique, pas déclarative.

create extension if not exists pgcrypto;

create type public.user_role      as enum ('member', 'agent', 'admin', 'lady');
create type public.lady_status    as enum ('draft', 'pending_review', 'published', 'rejected', 'suspended');
create type public.photo_status   as enum ('pending', 'approved', 'rejected');
create type public.marital_status as enum ('celibataire', 'divorcee', 'veuve', 'separee');

-- ---------------------------------------------------------------- utilitaires

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         public.user_role not null default 'member',
  display_name text,
  country      text,
  locale       text not null default 'fr',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Un profil est créé automatiquement à chaque inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers utilisés par les politiques RLS. En SECURITY DEFINER pour qu'ils
-- lisent profiles/agents sans repasser par les politiques de ces tables — sans
-- quoi la première policy qui les appelle boucle sur elle-même.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.current_agent_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.agents where profile_id = auth.uid()
$$;

-- ---------------------------------------------------------------- agents

create table public.agents (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid unique references public.profiles(id) on delete set null,
  code            text not null unique,
  agency_name     text not null,
  contact_name    text,
  email           text not null,
  phone           text,
  country         text,
  city            text,
  languages       text[] not null default '{}',
  contract_signed boolean not null default false,
  contract_date   date,
  status          text not null default 'active' check (status in ('active', 'suspended')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- ladies

-- Colonnes publiques uniquement. `age` est dérivé de la date de naissance, qui
-- reste dans lady_private : on affiche l'âge sans publier la date exacte.
create table public.ladies (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  agent_id            uuid references public.agents(id) on delete restrict,
  status              public.lady_status not null default 'draft',

  display_name        text not null,
  age                 int check (age between 18 and 99),
  display_city        text,
  display_country     text,
  languages           jsonb not null default '[]'::jsonb,
  marital_status      public.marital_status,
  children            text,
  profession          text,
  education           text,
  height_cm           int check (height_cm between 120 and 220),
  weight_kg           int check (weight_kg between 35 and 200),
  eyes                text,
  hair                text,
  religion            text,
  smoking             text,
  drinking            text,
  interests           text[] not null default '{}',
  seeking             text,
  seeking_age_min     int check (seeking_age_min between 18 and 99),
  seeking_age_max     int check (seeking_age_max between 18 and 99),
  willing_to_relocate text,
  headline            text,
  bio                 text,
  looking_for         text,

  published_at        timestamptz,
  last_seen_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint ladies_seeking_age_range check (
    seeking_age_min is null or seeking_age_max is null or seeking_age_min <= seeking_age_max
  )
);

create trigger ladies_updated_at
  before update on public.ladies
  for each row execute function public.set_updated_at();

create index ladies_agent_idx     on public.ladies (agent_id);
create index ladies_status_idx    on public.ladies (status);
create index ladies_published_idx on public.ladies (status, last_seen_at desc) where status = 'published';
create index ladies_country_idx   on public.ladies (display_country);

-- ---------------------------------------------------------------- lady_private

create table public.lady_private (
  lady_id            uuid primary key references public.ladies(id) on delete cascade,
  legal_name         text not null,
  birth_date         date not null,
  nationality        text,
  residence_country  text,
  residence_city     text,
  email              text,
  phone              text,
  id_document_type   text,
  id_document_number text,
  id_document_path   text,
  id_selfie_path     text,
  mandate_signed     boolean not null default false,
  mandate_date       date,
  mandate_path       text,
  photo_consent      boolean not null default false,
  internal_notes     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint lady_private_birth_date_adult check (birth_date <= (current_date - interval '18 years'))
);

create trigger lady_private_updated_at
  before update on public.lady_private
  for each row execute function public.set_updated_at();

-- Recopie l'âge dans la table publique dès que la date de naissance change.
create or replace function public.sync_lady_age()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.ladies
     set age = extract(year from age(new.birth_date))::int
   where id = new.lady_id;
  return new;
end $$;

create trigger lady_private_sync_age
  after insert or update of birth_date on public.lady_private
  for each row execute function public.sync_lady_age();

-- ---------------------------------------------------------------- lady_photos

create table public.lady_photos (
  id             uuid primary key default gen_random_uuid(),
  lady_id        uuid not null references public.ladies(id) on delete cascade,
  storage_path   text not null,
  position       int not null default 1 check (position >= 1),
  caption        text,
  status         public.photo_status not null default 'pending',
  rejection_note text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (lady_id, position)
);

create trigger lady_photos_updated_at
  before update on public.lady_photos
  for each row execute function public.set_updated_at();

create index lady_photos_lady_idx on public.lady_photos (lady_id, position);
