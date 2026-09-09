import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/types";

export type PhotoAffichee = {
  id: string;
  url: string;
  position: number;
  caption: string | null;
  /** Vrai si la photo n'est visible qu'après déblocage par des crédits. */
  prive: boolean;
  /** Coût du déblocage en crédits, uniquement quand `prive` est vrai. */
  coutDeblocage: number | null;
};

/**
 * Génération du floutage. À incrémenter dès que `flouter` change de recette.
 *
 * Une photo privée garde la même adresse tant que la ligne ne bouge pas, et
 * cette adresse est mise en cache pour des heures, chez les visiteurs comme
 * dans les relais. Corriger le flou sans changer l'adresse ne servirait donc à
 * rien : les caches continueraient à servir l'ancien. Ce numéro fait partie de
 * l'adresse, il suffit de le changer pour que tout le monde reparte du serveur.
 *
 * La génération 1 floutait à peine — deux `resize` sur une même chaîne sharp ne
 * s'enchaînent pas, la réduction était donc ignorée et les visages restaient
 * lisibles.
 */
const GENERATION_FLOU = 2;

/**
 * Adresse stable et cachable d'une photo publique.
 *
 * La version occupe un segment de chemin plutôt qu'un paramètre de requête :
 * l'optimiseur d'images de Next rejette les URL locales qui en portent un. Ce
 * segment n'est jamais relu côté serveur — l'identifiant suffit à retrouver la
 * ligne — il ne sert qu'à distinguer deux états d'une même photo dans les
 * caches.
 */
export function urlPhoto(id: string, misAJour?: string | null, prive = false) {
  const version = (misAJour ? Date.parse(misAJour) : 0) || 0;
  return `/api/photos/${id}/${prive ? `${version}f${GENERATION_FLOU}` : version}`;
}

/**
 * Photos validées d'un lot de fiches publiées, sous forme d'URL stables.
 *
 * Une seule requête pour toute la page, et surtout aucun appel de signature :
 * l'ancienne version signait chaque photo l'une après l'autre, soit une
 * trentaine d'allers-retours réseau avant même le premier octet de HTML.
 *
 * Une photo privée garde la même URL stable que les autres : c'est la route
 * qui la sert qui décide, à chaque requête, de rendre l'image floutée ou
 * intacte. Rien à faire ici pour qu'une photo non déverrouillée s'affiche
 * automatiquement floutée partout où cette fonction est utilisée.
 */
export async function photosPubliques(
  supabase: SupabaseClient<Database>,
  ladyIds: string[],
) {
  const parFemme = new Map<string, PhotoAffichee[]>();
  if (!ladyIds.length) return parFemme;

  const { data: photos } = await supabase
    .from("lady_photos")
    .select("id, lady_id, position, caption, updated_at, is_private, unlock_cost")
    .in("lady_id", ladyIds)
    .eq("status", "approved")
    .order("position");

  for (const photo of photos ?? []) {
    const liste = parFemme.get(photo.lady_id) ?? [];
    liste.push({
      id: photo.id,
      url: urlPhoto(photo.id, photo.updated_at, photo.is_private),
      position: photo.position,
      caption: photo.caption,
      prive: photo.is_private,
      coutDeblocage: photo.is_private ? photo.unlock_cost : null,
    });
    parFemme.set(photo.lady_id, liste);
  }

  return parFemme;
}

/**
 * Adresse de la version intacte d'une photo privée, réservée à qui l'a payée.
 *
 * Contrairement à `urlPhoto`, cette adresse n'est pas mise en cache par un
 * relais partagé (CDN) : la réponse dépend de qui demande, un cache commun la
 * servirait donc soit à tort à un non-payeur, soit floutée à qui a payé.
 */
export function urlPhotoDebloquee(id: string) {
  return `/api/photos-privees/${id}`;
}

/**
 * Signe les photos d'un lot de fiches, quel que soit leur état.
 *
 * Réservé aux écrans d'administration et d'agent : eux seuls ont besoin de voir
 * une photo en attente ou refusée, que la route publique refuse de servir. Le
 * compartiment étant privé, sans URL signée aucune image ne s'affiche.
 */
export async function photosSignees(
  supabase: SupabaseClient<Database>,
  ladyIds: string[],
  options: { toutes?: boolean; duree?: number } = {},
) {
  const { toutes = false, duree = 3600 } = options;
  const parFemme = new Map<string, PhotoAffichee[]>();

  if (!ladyIds.length) return parFemme;

  let requete = supabase
    .from("lady_photos")
    .select("id, lady_id, storage_path, position, caption, status, is_private, unlock_cost")
    .in("lady_id", ladyIds)
    .order("position");

  if (!toutes) requete = requete.eq("status", "approved");

  const { data: photos } = await requete;

  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("lady-photos")
      .createSignedUrl(photo.storage_path, duree);

    if (!data?.signedUrl) continue;

    const liste = parFemme.get(photo.lady_id) ?? [];
    liste.push({
      id: photo.id,
      url: data.signedUrl,
      position: photo.position,
      caption: photo.caption,
      // Cette route sert des URL signées à l'agent ou à l'administration : eux
      // voient toujours l'original, le flou n'a de sens que côté public.
      prive: photo.is_private,
      coutDeblocage: photo.is_private ? photo.unlock_cost : null,
    });
    parFemme.set(photo.lady_id, liste);
  }

  return parFemme;
}
