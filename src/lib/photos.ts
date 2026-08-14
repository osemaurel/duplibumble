import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/types";

export type PhotoAffichee = {
  url: string;
  position: number;
  caption: string | null;
};

/** Adresse stable et cachable d'une photo publique. */
export function urlPhoto(id: string, misAJour?: string | null) {
  const version = misAJour ? Date.parse(misAJour) : 0;
  return version ? `/api/photos/${id}?v=${version}` : `/api/photos/${id}`;
}

/**
 * Photos validées d'un lot de fiches publiées, sous forme d'URL stables.
 *
 * Une seule requête pour toute la page, et surtout aucun appel de signature :
 * l'ancienne version signait chaque photo l'une après l'autre, soit une
 * trentaine d'allers-retours réseau avant même le premier octet de HTML.
 */
export async function photosPubliques(
  supabase: SupabaseClient<Database>,
  ladyIds: string[],
) {
  const parFemme = new Map<string, PhotoAffichee[]>();
  if (!ladyIds.length) return parFemme;

  const { data: photos } = await supabase
    .from("lady_photos")
    .select("id, lady_id, position, caption, updated_at")
    .in("lady_id", ladyIds)
    .eq("status", "approved")
    .order("position");

  for (const photo of photos ?? []) {
    const liste = parFemme.get(photo.lady_id) ?? [];
    liste.push({
      url: urlPhoto(photo.id, photo.updated_at),
      position: photo.position,
      caption: photo.caption,
    });
    parFemme.set(photo.lady_id, liste);
  }

  return parFemme;
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
    .select("lady_id, storage_path, position, caption, status")
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
    liste.push({ url: data.signedUrl, position: photo.position, caption: photo.caption });
    parFemme.set(photo.lady_id, liste);
  }

  return parFemme;
}
