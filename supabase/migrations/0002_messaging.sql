-- Palab — conversations et messages.
--
-- Un message envoyé côté femme porte deux signatures : la femme au nom de qui
-- il part (via la conversation) et l'agent qui l'a réellement rédigé. Le membre
-- ne voit que la première ; l'administration dispose des deux.

create type public.message_sender as enum ('member', 'lady');

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.profiles(id) on delete cascade,
  lady_id         uuid not null references public.ladies(id) on delete cascade,
  last_message_at timestamptz,
  member_unread   int not null default 0 check (member_unread >= 0),
  agent_unread    int not null default 0 check (agent_unread >= 0),
  created_at      timestamptz not null default now(),

  unique (member_id, lady_id)
);

create index conversations_member_idx on public.conversations (member_id, last_message_at desc);
create index conversations_lady_idx   on public.conversations (lady_id, last_message_at desc);

create table public.messages (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references public.conversations(id) on delete cascade,
  sender               public.message_sender not null,
  sender_profile_id    uuid references public.profiles(id) on delete set null,
  authored_by_agent_id uuid references public.agents(id) on delete set null,
  body                 text not null check (length(btrim(body)) > 0),
  attachment_path      text,
  read_at              timestamptz,
  created_at           timestamptz not null default now(),

  -- Un message de membre vient du membre lui-même. Un message côté femme est
  -- écrit par son agent — ou, plus tard, par elle-même depuis son propre accès.
  constraint messages_authorship check (
    (sender = 'member'
      and sender_profile_id is not null
      and authored_by_agent_id is null)
    or
    (sender = 'lady'
      and (authored_by_agent_id is not null or sender_profile_id is not null))
  )
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_agent_idx        on public.messages (authored_by_agent_id, created_at desc);

-- Tient à jour l'horodatage et les compteurs de non-lus de la conversation.
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         member_unread   = case when new.sender = 'lady'   then member_unread + 1 else member_unread end,
         agent_unread    = case when new.sender = 'member' then agent_unread  + 1 else agent_unread  end
   where id = new.conversation_id;
  return new;
end $$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Vrai si l'utilisateur courant est l'agent mandaté de cette femme.
create or replace function public.agent_owns_lady(p_lady_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ladies l
     where l.id = p_lady_id
       and l.agent_id = public.current_agent_id()
  )
$$;

-- Vrai si l'utilisateur courant peut voir cette conversation (membre concerné,
-- agent mandaté, ou administration).
create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.conversations c
      join public.ladies l on l.id = c.lady_id
     where c.id = p_conversation_id
       and (
         c.member_id = auth.uid()
         or l.agent_id = public.current_agent_id()
         or public.is_admin()
       )
  )
$$;
