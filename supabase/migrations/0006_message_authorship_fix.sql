-- Palab — l'authorship d'un message doit survivre à la suppression d'un compte.
--
-- La contrainte d'origine exigeait en permanence la présence de l'auteur. Or
-- supprimer un agent met authored_by_agent_id à NULL, et supprimer un membre
-- fait de même pour sender_profile_id : la contrainte se retournait alors
-- contre nous et faisait échouer la suppression — y compris une demande
-- légitime d'effacement.
--
-- On garde donc en contrainte permanente ce qui reste vrai pour toujours, et on
-- déplace la règle d'auteur à l'insertion, seul moment où l'on peut réellement
-- l'exiger. Un agent qui quitte la plateforme laisse ses messages en place,
-- simplement sans signature.

alter table public.messages drop constraint messages_authorship;

alter table public.messages add constraint messages_authorship check (
  sender <> 'member' or authored_by_agent_id is null
);

create or replace function public.check_message_authorship()
returns trigger language plpgsql as $$
begin
  if new.sender = 'member' and new.sender_profile_id is null then
    raise exception 'Un message de membre doit porter l''identifiant de son auteur';
  end if;
  if new.sender = 'lady'
     and new.authored_by_agent_id is null
     and new.sender_profile_id is null then
    raise exception 'Un message envoye au nom d''une femme doit indiquer qui l''a redige';
  end if;
  return new;
end $$;

create trigger messages_check_authorship
  before insert on public.messages
  for each row execute function public.check_message_authorship();
