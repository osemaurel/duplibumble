-- Palab — pièces jointes des messages.
--
-- Compartiment privé, une seule règle d'accès : être partie prenante de la
-- conversation. On réutilise `can_access_conversation`, déjà employée par les
-- politiques de la table `messages` — la pièce jointe suit donc exactement le
-- même droit que le message qui la porte.
--
-- Convention de chemin : <conversation_id>/<fichier>. Le premier segment
-- identifie la conversation, c'est lui qui est vérifié.

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

create policy "participants lisent les pieces jointes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_conversation(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy "participants envoient des pieces jointes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and public.can_access_conversation(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy "administration gere les pieces jointes"
  on storage.objects for all to authenticated
  using (bucket_id = 'message-attachments' and public.is_admin())
  with check (bucket_id = 'message-attachments' and public.is_admin());

-- Une photo peut se passer de légende : le corps n'est plus exigé dès lors
-- qu'une pièce jointe accompagne le message. Sans cela, envoyer une image
-- seule serait refusé par la base.
alter table public.messages drop constraint messages_body_check;

alter table public.messages add constraint messages_contenu check (
  length(btrim(body)) > 0 or attachment_path is not null
);
