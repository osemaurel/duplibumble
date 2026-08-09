-- Palab — crédits, achats, signalements.
--
-- Le solde d'un membre n'est jamais écrit directement : il est dérivé du
-- journal des mouvements par un trigger. Chaque débit référence le message ou
-- l'appel qui l'a provoqué, de sorte que toute ligne du relevé soit justifiable
-- en cas de contestation.

create type public.credit_reason as enum (
  'purchase', 'message', 'video_minute', 'gift', 'refund', 'bonus', 'adjustment'
);

create table public.purchases (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.profiles(id) on delete cascade,
  provider     text not null default 'stripe',
  provider_ref text,
  credits      int not null check (credits > 0),
  amount_cents int not null check (amount_cents >= 0),
  currency     text not null default 'EUR',
  status       text not null default 'pending'
                 check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (provider, provider_ref)
);

create trigger purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

create index purchases_member_idx on public.purchases (member_id, created_at desc);

create table public.credit_balances (
  member_id  uuid primary key references public.profiles(id) on delete cascade,
  balance    int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.credit_transactions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.profiles(id) on delete cascade,
  amount      int not null check (amount <> 0),
  reason      public.credit_reason not null,
  message_id  uuid references public.messages(id) on delete set null,
  purchase_id uuid references public.purchases(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index credit_transactions_member_idx on public.credit_transactions (member_id, created_at desc);

-- Le solde suit le journal, jamais l'inverse.
create or replace function public.apply_credit_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_balances (member_id, balance, updated_at)
  values (new.member_id, new.amount, now())
  on conflict (member_id) do update
    set balance    = public.credit_balances.balance + excluded.balance,
        updated_at = now();
  return new;
end $$;

create trigger credit_transactions_apply
  after insert on public.credit_transactions
  for each row execute function public.apply_credit_transaction();

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  lady_id         uuid references public.ladies(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason          text not null,
  details         text,
  status          text not null default 'open'
                    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
