import { parNouveaute } from "./classement";
import { photosPubliques } from "./photos";
import { profiles as demonstration } from "./profiles";
import { createClient } from "./supabase/server";

/**
 * Profils affichés sur la page d'accueil.
 *
 * Les fiches réellement publiées d'abord ; à défaut, les profils de
 * démonstration. Le basculement se fait donc tout seul à la première
 * publication, et la vitrine ne se retrouve jamais vide.
 */
export type ProfilVitrine = {
  id: string;
  href: string;
  nom: string;
  age: number | null;
  lieu: string;
  photo: string;
  /** Faux pour les profils de démonstration. */
  reel: boolean;
};

export async function profilsVitrine(limite = 12): Promise<ProfilVitrine[]> {
  const supabase = await createClient();

  // On en demande plus que nécessaire : les fiches sans photo validée sont
  // écartées juste après, et s'arrêter à `limite` d'emblée laisserait un
  // éventail incomplet dès qu'un lot arrive avec ses photos encore à modérer.
  // Le RLS ne laisse sortir que les fiches publiées : inutile de filtrer ici.
  const { data: femmes } = await parNouveaute(
    supabase.from("ladies").select("id, display_name, age, display_city, display_country"),
  ).limit(limite * 3);

  const publiees = femmes ?? [];

  if (publiees.length) {
    const photos = await photosPubliques(
      supabase,
      publiees.map((f) => f.id),
    );

    const avecPhoto = publiees
      .map((femme): ProfilVitrine | null => {
        const principale = photos.get(femme.id)?.[0];
        if (!principale) return null;
        return {
          id: femme.id,
          href: `/profils/${femme.id}`,
          nom: femme.display_name,
          age: femme.age,
          lieu: [femme.display_city, femme.display_country].filter(Boolean).join(", "),
          photo: principale.url,
          reel: true,
        };
      })
      .filter((p): p is ProfilVitrine => p !== null);

    // Une fiche publiée sans photo validée n'a rien à faire en vitrine : elle
    // afficherait un cadre vide au milieu du carrousel.
    if (avecPhoto.length) return avecPhoto.slice(0, limite);
  }

  return demonstration.slice(0, limite).map((p) => ({
    id: p.id,
    href: "/inscription",
    nom: p.name,
    age: p.age,
    lieu: p.location,
    photo: p.photo,
    reel: false,
  }));
}
