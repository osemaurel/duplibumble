import Link from "next/link";

import { profiles as demonstration } from "@/lib/profiles";
import { parNouveaute } from "@/lib/classement";
import { photosPubliques, type PhotoAffichee } from "@/lib/photos";
import { createPublicClient } from "@/lib/supabase/public";

import GroupePhotos from "./groupe-photos";
import Photo from "./photo";

/** Grille : deux colonnes sur mobile, jusqu'à six sur grand écran. */
const TAILLES = "(max-width:640px) 47vw, (max-width:1100px) 30vw, 300px";

const FILTRES = [
  { id: "age", label: "Âge", options: ["18-25", "26-35", "36-45", "46+"] },
  {
    id: "pays",
    label: "Pays",
    options: [] as string[],
  },
];

/**
 * Galerie de la page d'accueil.
 *
 * Elle sert les fiches réellement publiées. Tant qu'il n'y en a aucune, elle
 * retombe sur les profils de démonstration — la page reste présentable, et le
 * bandeau du pied de page indique déjà que ces personnes sont fictives. Le
 * basculement se fait tout seul dès la première publication.
 */
/**
 * Fiches publiées et leurs photos, ou rien si la base ne répond pas.
 *
 * Comme pour la vitrine : la page d'accueil étant rendue à la construction du
 * site, une base injoignable à cet instant ferait échouer le déploiement. Le
 * repli de démonstration existe déjà en aval, il suffit de l'atteindre.
 */
async function fichesPubliees() {
  try {
    // Sans cookies : la galerie ne montre que des fiches publiées, et la page
    // d'accueil qui la contient est rendue à l'avance.
    const supabase = createPublicClient();

    const { data: publiees } = await parNouveaute(
      supabase
        .from("ladies")
        .select("id, display_name, age, display_country, headline"),
    ).limit(12);

    const reelles = publiees ?? [];
    const photos = await photosPubliques(
      supabase,
      reelles.map((f) => f.id),
    );

    return { reelles, photos };
  } catch {
    return { reelles: [], photos: new Map<string, PhotoAffichee[]>() };
  }
}

export default async function Gallery() {
  const { reelles, photos } = await fichesPubliees();

  const paysDisponibles = [
    ...new Set(reelles.map((f) => f.display_country).filter(Boolean)),
  ].sort() as string[];

  const cartes = reelles.length
    ? reelles.map((f) => ({
        id: f.id,
        href: `/profils/${f.id}`,
        nom: f.display_name,
        age: f.age,
        photo: photos.get(f.id)?.[0]?.url ?? null,
      }))
    : demonstration.map((p) => ({
        id: p.id,
        href: "/inscription",
        nom: p.name,
        age: p.age as number | null,
        photo: p.photo,
      }));

  return (
    <section className="gal" id="profils">
      <div className="wrap">
        <div className="gal-head">
          <div>
            <h2>Elles sont en ligne maintenant</h2>
            <p>
              Parcourez les profils vérifiés de femmes du monde entier, puis lancez la
              conversation. Chaque profil est validé par notre équipe avant publication.
            </p>
          </div>
          <span className="live-count">
            <span className="live-dot" />
            {reelles.length ? `${reelles.length} profils publiés` : "Bientôt en ligne"}
          </span>
        </div>

        <form className="filters" action="/profils" method="get">
          <div className="filters-row">
            {FILTRES.map((filtre) => (
              <select key={filtre.id} name={filtre.id} defaultValue="" aria-label={filtre.label}>
                <option value="">{filtre.label}</option>
                {(filtre.id === "pays" ? paysDisponibles : filtre.options).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <button className="f-go" type="submit">
            Rechercher
          </button>
        </form>

        <GroupePhotos className="grid">
          {cartes.map((carte, rang) => (
            <article className="pcard" key={carte.id}>
              <Link href={carte.href} className="pcard-photo">
                <div className="ph" />
                {carte.photo ? (
                  <Photo
                    src={carte.photo}
                    alt={`Profil de ${carte.nom}`}
                    sizes={TAILLES}
                    prioritaire={rang < 6}
                  />
                ) : null}
                <span className="badge-ok">✓ Vérifié</span>
              </Link>

              <div className="pcard-body">
                <h3>
                  {carte.nom}
                  {carte.age ? `, ${carte.age}` : ""}
                </h3>
                <div className="pcard-acts">
                  <Link className="p-msg" href={carte.href}>
                    <span className="lbl-l">Envoyer un message</span>
                    <span className="lbl-s">Message</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </GroupePhotos>

        <div className="gal-more">
          <Link className="btn-dark" href="/profils">
            Voir tous les profils
          </Link>
        </div>
      </div>
    </section>
  );
}
