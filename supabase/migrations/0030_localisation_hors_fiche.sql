-- La fiche publique ne dit plus où elle vit.
--
-- Les présentations ont été relues une par une et débarrassées de toute
-- mention de lieu : ville, pays, nationalité, université nommée, cuisine ou
-- danse rattachée à un pays. Mais `ladies` portait aussi deux colonnes,
-- `display_city` et `display_country`, et cette table est lisible par
-- n'importe qui avec la clé publiable — celle qui part dans le HTML de chaque
-- page. Un seul appel suffisait à retrouver ce que les textes ne disaient
-- plus :
--
--   GET /rest/v1/ladies?select=display_name,display_city,display_country
--
-- Vérifié depuis l'extérieur, sans aucun compte : la ville et le pays de
-- chacune revenaient en clair. Tout le reste du travail n'aurait été que
-- décoratif.
--
-- Restreindre ces deux colonnes n'était pas une option : les droits de
-- colonne portent sur un rôle, et membres, agents et administration partagent
-- tous `authenticated`. Les cacher au membre les aurait cachées à l'agent.
--
-- Elles font de toute façon double emploi. La résidence réelle vit déjà dans
-- `lady_private.residence_city` / `residence_country`, renseignée pour les
-- 152 fiches, et dont le RLS n'ouvre la lecture qu'à l'agent mandaté et à
-- l'administration. C'est exactement le bon endroit.
--
-- Les valeurs supprimées ici sont conservées dans
-- `ladies_textes_avant_anonymisation`, avec les textes d'origine.

alter table public.ladies drop column if exists display_city;
alter table public.ladies drop column if exists display_country;
