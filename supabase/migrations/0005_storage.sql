-- Palab — stockage des fichiers.
--
-- Deux compartiments, tous deux privés :
--   lady-photos     les photos de profil. Lisibles par tous, mais uniquement
--                   lorsque la photo est validée et la fiche publiée — la
--                   condition est vérifiée à chaque téléchargement, pas au
--                   moment de l'envoi.
--   lady-documents  pièces d'identité et mandats. Jamais lisibles publiquement.
--
-- Convention de chemin : <lady_id>/<fichier>. Le premier segment identifie la
-- femme, ce qui permet de vérifier le mandat de l'agent sur chaque opération.

-- Convertit un segment de chemin en UUID, ou renvoie NULL s'il n'en est pas un.
-- Sans cela, un fichier déposé hors convention ferait échouer la politique sur
-- une erreur de conversion plutôt que sur un simple refus.
create or replace function public.safe_uuid(p_text text)
returns uuid language plpgsql immutable as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end $$;

insert into storage.buckets (id, name, public)
values ('lady-photos', 'lady-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lady-documents', 'lady-documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- lady-photos

create policy "photos publiques si validees et fiche publiee"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'lady-photos'
    and exists (
      select 1
        from public.lady_photos p
        join public.ladies l on l.id = p.lady_id
       where p.storage_path = storage.objects.name
         and p.status = 'approved'
         and l.status = 'published'
    )
  );

create policy "agent gere les photos de ses femmes"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'lady-photos'
    and public.agent_owns_lady(public.safe_uuid(split_part(name, '/', 1)))
  )
  with check (
    bucket_id = 'lady-photos'
    and public.agent_owns_lady(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy "administration gere toutes les photos"
  on storage.objects for all to authenticated
  using (bucket_id = 'lady-photos' and public.is_admin())
  with check (bucket_id = 'lady-photos' and public.is_admin());

-- ------------------------------------------------------------ lady-documents

create policy "agent gere les documents de ses femmes"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'lady-documents'
    and public.agent_owns_lady(public.safe_uuid(split_part(name, '/', 1)))
  )
  with check (
    bucket_id = 'lady-documents'
    and public.agent_owns_lady(public.safe_uuid(split_part(name, '/', 1)))
  );

create policy "administration gere tous les documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'lady-documents' and public.is_admin())
  with check (bucket_id = 'lady-documents' and public.is_admin());
