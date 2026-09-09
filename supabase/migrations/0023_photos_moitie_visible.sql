-- La moitié des photos visible, l'autre à débloquer.
--
-- La règle précédente offrait deux photos quel qu'en soit le nombre : une fiche
-- qui en portait trois en montrait deux, une fiche qui en portait douze en
-- montrait toujours deux. La proportion changeait donc du simple au sextuple
-- selon la fiche, sans raison. Une part fixe traite les fiches également : une
-- femme qui prend la peine d'en fournir douze en montre six.
--
-- L'impair penche du côté visible — cinq photos donnent trois visibles et deux
-- privées. Mieux vaut une photo offerte de plus qu'une retenue de plus : c'est
-- ce qui donne envie d'écrire, et le déblocage ne vaut que si l'envie précède.

-- Quinze crédits par photo était hors de proportion. La moitié des photos étant
-- désormais privée, une fiche de huit photos demandait soixante crédits pour
-- être vue entièrement, soit dix-huit à trente euros — un péage, pas un achat.
-- À cinq crédits, la photo revient à un ou deux euros et demi selon le palier,
-- et une fiche entière à moins de dix euros.
update public.tarifs
   set montant = 5,
       libelle = 'Déblocage d''une photo privée',
       updated_at = now()
 where code = 'photo_privee';

-- Le nombre de photos visibles n'est plus un réglage : il se déduit du nombre
-- de photos de la fiche.
delete from public.tarifs where code = 'photos_publiques';

create or replace function public.appliquer_confidentialite_photos(p_lady_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total    integer;
  v_visibles integer;
  v_prix     integer;
begin
  select count(*) into v_total from public.lady_photos where lady_id = p_lady_id;

  -- Arrondi au supérieur : sur un nombre impair, la photo en trop est offerte.
  v_visibles := ceil(v_total::numeric / 2);

  select montant into v_prix from public.tarifs where code = 'photo_privee';
  -- Le prix doit rester strictement positif : la contrainte
  -- `lady_photos_unlock_cost_positif` refuse une photo privée sans prix, et un
  -- tarif mal renseigné bloquerait alors tout ajout de photo.
  v_prix := greatest(coalesce(v_prix, 5), 1);

  update public.lady_photos p
     set is_private  = r.privee,
         -- Un prix déjà fixé par l'agent est conservé : la règle décide de ce
         -- qui est privé, lui de ce que cela coûte.
         unlock_cost = case when r.privee then coalesce(p.unlock_cost, v_prix) end
    from (
      select id,
             -- Le rang, pas la valeur de `position` : après une suppression les
             -- positions ne se resserrent pas, une fiche peut porter 1, 4 et 9.
             row_number() over (order by position) > v_visibles as privee
        from public.lady_photos
       where lady_id = p_lady_id
    ) r
   where p.id = r.id
     -- N'écrire que ce qui change : une mise à jour qui ne modifie rien
     -- réveillerait quand même le déclencheur.
     and (
       p.is_private is distinct from r.privee
       or (r.privee and p.unlock_cost is null)
       or (not r.privee and p.unlock_cost is not null)
     );
end $$;

-- Les fiches existantes suivent la nouvelle proportion, et les photos déjà
-- privées au tarif précédent reviennent au nouveau. Aucune n'a encore été
-- débloquée par un membre ; le cas échéant, `photo_unlocks` garde la trace de
-- ce qui a été payé et le déblocage reste acquis quel que soit le prix courant.
update public.lady_photos set unlock_cost = 5 where is_private and unlock_cost = 15;

do $$
declare
  v_fiche record;
begin
  for v_fiche in select distinct lady_id from public.lady_photos loop
    perform public.appliquer_confidentialite_photos(v_fiche.lady_id);
  end loop;
end $$;
