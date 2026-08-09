-- Palab — activation du RLS et politiques d'accès.
--
-- Principe : un agent ne voit que les femmes dont il est le mandataire, et
-- rien du portefeuille d'un confrère. Un membre ne voit que ses propres
-- conversations et son propre solde. Le public ne voit que les fiches publiées
-- et leurs photos validées — les données internes vivent dans lady_private,
-- qui n'a aucune politique de lecture publique.
--
-- Les garde-fous que le RLS ne sait pas exprimer (interdire la modification
-- d'une seule colonne) sont posés en triggers : publication d'une fiche,
-- validation d'une photo, réattribution d'un portefeuille et changement de
-- rôle restent réservés à l'administration.

alter table public.profiles            enable row level security;
alter table public.agents              enable row level security;
alter table public.ladies              enable row level security;
alter table public.lady_private        enable row level security;
alter table public.lady_photos         enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.purchases           enable row level security;
alter table public.credit_balances     enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.reports             enable row level security;

-- ---------------------------------------------------------------- garde-fous
-- auth.uid() est nul côté service_role : les traitements serveur de confiance
-- (webhooks de paiement, imports) passent, les utilisateurs non.

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.role is distinct from old.role then
    raise exception 'Seule l''administration peut modifier un rôle';
  end if;
  return new;
end $$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

create or replace function public.guard_lady_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.agent_id is distinct from old.agent_id then
    raise exception 'Seule l''administration peut réattribuer une femme à un autre agent';
  end if;
  if new.status is distinct from old.status
     and new.status not in ('draft', 'pending_review') then
    raise exception 'Seule l''administration peut publier, refuser ou suspendre une fiche';
  end if;
  return new;
end $$;

create trigger ladies_guard_admin_fields
  before update on public.ladies
  for each row execute function public.guard_lady_admin_fields();

create or replace function public.guard_photo_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.status is distinct from old.status and new.status <> 'pending' then
    raise exception 'Seule l''administration peut valider une photo';
  end if;
  return new;
end $$;

create trigger lady_photos_guard_status
  before update on public.lady_photos
  for each row execute function public.guard_photo_status();

-- ---------------------------------------------------------------- profiles

create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

-- Un agent doit pouvoir afficher le nom du membre qui écrit à l'une de ses femmes.
create policy profiles_select_agent_counterpart on public.profiles
  for select to authenticated using (
    exists (
      select 1
        from public.conversations c
        join public.ladies l on l.id = c.lady_id
       where c.member_id = public.profiles.id
         and l.agent_id = public.current_agent_id()
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- agents

create policy agents_select_self on public.agents
  for select to authenticated using (profile_id = auth.uid());

create policy agents_select_admin on public.agents
  for select to authenticated using (public.is_admin());

create policy agents_update_self on public.agents
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy agents_admin_all on public.agents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- ladies

create policy ladies_select_published on public.ladies
  for select to anon, authenticated using (status = 'published');

create policy ladies_select_own_agent on public.ladies
  for select to authenticated using (agent_id = public.current_agent_id());

create policy ladies_select_admin on public.ladies
  for select to authenticated using (public.is_admin());

create policy ladies_insert_own_agent on public.ladies
  for insert to authenticated
  with check (
    agent_id = public.current_agent_id()
    and status in ('draft', 'pending_review')
  );

create policy ladies_update_own_agent on public.ladies
  for update to authenticated
  using (agent_id = public.current_agent_id())
  with check (agent_id = public.current_agent_id());

create policy ladies_admin_all on public.ladies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- lady_private

create policy lady_private_agent on public.lady_private
  for all to authenticated
  using (public.agent_owns_lady(lady_id))
  with check (public.agent_owns_lady(lady_id));

create policy lady_private_admin on public.lady_private
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- lady_photos

create policy lady_photos_select_public on public.lady_photos
  for select to anon, authenticated using (
    status = 'approved'
    and exists (
      select 1 from public.ladies l
       where l.id = public.lady_photos.lady_id
         and l.status = 'published'
    )
  );

create policy lady_photos_agent on public.lady_photos
  for all to authenticated
  using (public.agent_owns_lady(lady_id))
  with check (public.agent_owns_lady(lady_id));

create policy lady_photos_admin on public.lady_photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- conversations

create policy conversations_select on public.conversations
  for select to authenticated using (
    member_id = auth.uid()
    or public.agent_owns_lady(lady_id)
    or public.is_admin()
  );

create policy conversations_insert_member on public.conversations
  for insert to authenticated
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.ladies l
       where l.id = public.conversations.lady_id
         and l.status = 'published'
    )
  );

create policy conversations_update_participants on public.conversations
  for update to authenticated
  using (member_id = auth.uid() or public.agent_owns_lady(lady_id) or public.is_admin())
  with check (member_id = auth.uid() or public.agent_owns_lady(lady_id) or public.is_admin());

-- ---------------------------------------------------------------- messages

create policy messages_select on public.messages
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

create policy messages_insert_member on public.messages
  for insert to authenticated
  with check (
    sender = 'member'
    and sender_profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = public.messages.conversation_id
         and c.member_id = auth.uid()
    )
  );

-- L'agent écrit au nom de la femme qu'il représente, et se signe.
create policy messages_insert_agent on public.messages
  for insert to authenticated
  with check (
    sender = 'lady'
    and authored_by_agent_id = public.current_agent_id()
    and exists (
      select 1
        from public.conversations c
        join public.ladies l on l.id = c.lady_id
       where c.id = public.messages.conversation_id
         and l.agent_id = public.current_agent_id()
    )
  );

create policy messages_update_participants on public.messages
  for update to authenticated
  using (public.can_access_conversation(conversation_id))
  with check (public.can_access_conversation(conversation_id));

create policy messages_admin_all on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------- crédits, achats, relevés
-- En écriture, rien n'est ouvert aux utilisateurs : les mouvements sont
-- inscrits côté serveur (webhook de paiement, envoi de message), avec la clé
-- de service. Les membres ne font que consulter.

create policy purchases_select_own on public.purchases
  for select to authenticated using (member_id = auth.uid());

create policy purchases_admin on public.purchases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy credit_balances_select_own on public.credit_balances
  for select to authenticated using (member_id = auth.uid());

create policy credit_balances_admin on public.credit_balances
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated using (member_id = auth.uid());

create policy credit_transactions_admin on public.credit_transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- reports

create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());

create policy reports_admin on public.reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
