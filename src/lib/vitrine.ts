import { parNouveaute } from "./classement";
import { photosPubliques } from "./photos";
import { profiles as demonstration } from "./profiles";
import { createPublicClient } from "./supabase/public";

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
  photo: string;
  /** Faux pour les profils de démonstration. */
  reel: boolean;
};

/**
 * Fiches réellement publiées, ou liste vide si la base ne répond pas.
 *
 * L'accueil est désormais rendu à l'avance, à la construction du site : une
 * base injoignable à cet instant ferait échouer le déploiement entier, là où
 * elle ne gâchait auparavant qu'une visite. La page a déjà un repli — les
 * profils de démonstration — encore faut-il l'atteindre plutôt que de
 * s'interrompre avant.
 */
async function femmesPubliees(limite: number): Promise<ProfilVitrine[]> {
  try {
    // Client sans cookies : la vitrine ne montre que des fiches publiées, et
    // lire un cookie ici rendrait la page d'accueil dynamique — donc
    // reconstruite à chaque visite, pour un contenu identique pour tous.
    const supabase = createPublicClient();

    // On en demande plus que nécessaire : les fiches sans photo validée sont
    // écartées juste après, et s'arrêter à `limite` d'emblée laisserait un
    // éventail incomplet dès qu'un lot arrive avec ses photos encore à modérer.
    // Le RLS ne laisse sortir que les fiches publiées : inutile de filtrer ici.
    const { data: femmes } = await parNouveaute(
      supabase.from("ladies").select("id, display_name, age"),
    ).limit(limite * 3);

    const publiees = femmes ?? [];
    if (!publiees.length) return [];

    const photos = await photosPubliques(
      supabase,
      publiees.map((f) => f.id),
    );

    return (
      publiees
        .map((femme): ProfilVitrine | null => {
          const principale = photos.get(femme.id)?.[0];
          if (!principale) return null;
          return {
            id: femme.id,
            href: `/profils/${femme.id}`,
            nom: femme.display_name,
            age: femme.age,
            photo: principale.url,
            reel: true,
          };
        })
        // Une fiche publiée sans photo validée n'a rien à faire en vitrine :
        // elle afficherait un cadre vide au milieu du carrousel.
        .filter((p): p is ProfilVitrine => p !== null)
    );
  } catch {
    return [];
  }
}

export async function profilsVitrine(limite = 12): Promise<ProfilVitrine[]> {
  const avecPhoto = await femmesPubliees(limite);
  if (avecPhoto.length) return avecPhoto.slice(0, limite);

  return demonstration.slice(0, limite).map((p) => ({
    id: p.id,
    href: "/inscription",
    nom: p.name,
    age: p.age,
    photo: p.photo,
    reel: false,
  }));
}
