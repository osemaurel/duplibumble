-- Deux photos visibles, le reste à débloquer.
--
-- La règle est systématique et non plus laissée à l'appréciation de chacun :
-- les deux premières photos d'une fiche sont visibles de tous, les suivantes
-- sont privées et floutées jusqu'à ce qu'un membre les débloque.
--
-- Elle vit ici, dans un déclencheur, et non dans le formulaire de l'agent.
-- Une photo peut arriver par trois chemins — l'agent, l'administration, un
-- import de dossier — et une règle recopiée dans trois écrans finit toujours
-- par manquer dans l'un d'eux. Écrite là, elle tient quelle que soit la porte
-- d'entrée, y compris celles qui n'existent pas encore.

-- Le nombre de photos visibles et le prix de déblocage sont des réglages, pas
-- des constantes du code : ils rejoignent la table des tarifs, d'où le
-- déclencheur et l'affichage les relisent tous deux. Il n'existe pas encore
-- d'écran pour les modifier — cela se fait en SQL, comme pour les autres
-- lignes de cette table.
--
-- `do nothing` et non `do update` : une fois posée, la valeur appartient à
-- l'exploitation, et rejouer cette migration ne doit pas écraser son choix.
insert into public.tarifs (code, montant, libelle) values
  ('photos_publiques', 2,  'Photos visibles sans crédits'),
  ('photo_privee',     15, 'Déblocage d''une photo privée')
on conflict (code) do nothing;

/**
 * Recalcule, pour une fiche entière, quelles photos sont privées.
 *
 * Le rang plutôt que la valeur de `position` : après la suppression d'une
 * photo, les positions restantes ne se resserrent pas — une fiche peut porter
 * les positions 1, 4 et 9. Comparer `position` à deux aurait alors rendu
 * privées des photos qui sont pourtant les premières de la fiche.
 */
create or replace function public.appliquer_confidentialite_photos(p_lady_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visibles integer;
  v_prix     integer;
begin
  select montant into v_visibles from public.tarifs where code = 'photos_publiques';
  select montant into v_prix     from public.tarifs where code = 'photo_privee';

  v_visibles := coalesce(v_visibles, 2);
  -- Le prix doit rester strictement positif : la contrainte
  -- `lady_photos_unlock_cost_positif` refuse une photo privée sans prix, et un
  -- tarif mal renseigné bloquerait alors tout ajout de photo.
  v_prix := greatest(coalesce(v_prix, 15), 1);

  update public.lady_photos p
     set is_private  = r.privee,
         -- Un prix déjà fixé par l'agent est conservé : la règle décide de ce
         -- qui est privé, lui de ce que cela coûte.
         unlock_cost = case when r.privee then coalesce(p.unlock_cost, v_prix) end
    from (
      select id,
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

create or replace function public.photos_confidentialite_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- La fonction appelée écrit dans la table qui vient de déclencher celle-ci :
  -- sans ce garde-fou, son écriture rappellerait le déclencheur sans fin.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.appliquer_confidentialite_photos(old.lady_id);
  else
    perform public.appliquer_confidentialite_photos(new.lady_id);
    -- Une photo déplacée d'une fiche à l'autre laisse deux fiches à recalculer.
    if tg_op = 'UPDATE' and old.lady_id is distinct from new.lady_id then
      perform public.appliquer_confidentialite_photos(old.lady_id);
    end if;
  end if;

  return null;
end $$;

create trigger lady_photos_confidentialite
  after insert or delete or update of lady_id, position on public.lady_photos
  for each row execute function public.photos_confidentialite_auto();

-- Les fiches déjà en ligne suivent la même règle : sans ce rattrapage, elle ne
-- vaudrait que pour les photos à venir.
do $$
declare
  v_fiche record;
begin
  for v_fiche in select distinct lady_id from public.lady_photos loop
    perform public.appliquer_confidentialite_photos(v_fiche.lady_id);
  end loop;
end $$;
