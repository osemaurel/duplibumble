import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./supabase/types";

/**
 * Signe les photos validées d'un lot de fiches.
 *
 * Le compartiment est privé : sans URL signée, aucune image ne s'affiche. On
 * signe en une passe pour toute une page, plutôt qu'une requête par vignette.
 */
export async function photosSignees(
  supabase: SupabaseClient<Database>,
  ladyIds: string[],
  options: { toutes?: boolean; duree?: number } = {},
) {
  const { toutes = false, duree = 3600 } = options;
  const parFemme = new Map<string, { url: string; position: number; caption: string | null }[]>();

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
