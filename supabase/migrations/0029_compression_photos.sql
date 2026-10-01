-- Recompression des photos déjà déposées.
--
-- Les photos étaient stockées telles que l'appareil les avait produites :
-- 538 fichiers, 3 Mo en moyenne, 1,6 Go au total — pour un site qui n'affiche
-- jamais plus de 1280 pixels de large. Le quota de stockage a fini par céder
-- et le projet a été restreint : plus personne ne pouvait se connecter.
--
-- Les envois futurs sont réduits dans le navigateur. Reste le passif, que
-- l'administration traite depuis son interface, par lots.
--
-- Une colonne plutôt qu'un calcul : la reprise doit survivre à une fermeture
-- d'onglet, à une erreur au milieu, à un second passage. Ce qui est fait est
-- écrit, et n'est jamais refait.

alter table public.lady_photos
  add column if not exists compresse_le timestamptz;

comment on column public.lady_photos.compresse_le is
  'Date de passage par la recompression. Nul = pas encore traitée.';

-- L'index sert la seule question posée : « que reste-t-il à traiter ? ».
-- Partiel, donc il disparaît de lui-même à mesure que la file se vide.
create index if not exists lady_photos_a_compresser_idx
  on public.lady_photos (created_at)
  where compresse_le is null;
