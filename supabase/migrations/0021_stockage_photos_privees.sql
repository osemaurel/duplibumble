-- Ferme l'accès direct au fichier d'une photo privée.
--
-- La politique de stockage posée en 0005 autorisait la lecture de toute photo
-- validée d'une fiche publiée, sans regarder `is_private` — introduite avant
-- que cette colonne n'existe. Avec la clé publique (anon), n'importe qui
-- pouvait donc demander une URL signée ou télécharger directement l'original
-- d'une photo privée, en contournant entièrement le flou appliqué par la
-- route applicative. Le flou ne vaut que si le fichier source reste
-- inatteignable par ce chemin : seule la clé de service (utilisée par les
-- routes serveur) continue d'y accéder.

drop policy "photos publiques si validees et fiche publiee" on storage.objects;

create policy "photos publiques si validees, publiees et non privees"
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
         and not p.is_private
    )
  );
