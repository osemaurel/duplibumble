-- Réponses types : messages pré-rédigés qu'un agent réutilise d'un membre à
-- l'autre — accueil, relance, indisponibilité — sans les retaper à chaque
-- fois. Strictement personnelles : un agent ne voit ni ne modifie celles d'un
-- confrère.

create table public.reponses_types (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents(id) on delete cascade,
  libelle    text not null,
  corps      text not null check (length(btrim(corps)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reponses_types_updated_at
  before update on public.reponses_types
  for each row execute function public.set_updated_at();

create index reponses_types_agent_idx on public.reponses_types (agent_id, created_at);

alter table public.reponses_types enable row level security;

create policy reponses_types_agent on public.reponses_types
  for all to authenticated
  using (agent_id = public.current_agent_id())
  with check (agent_id = public.current_agent_id());

create policy reponses_types_admin on public.reponses_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
