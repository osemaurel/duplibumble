import Link from "next/link";

import { profiles as demonstration } from "@/lib/profiles";
import { photosSignees } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

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
export default async function Gallery() {
  const supabase = await createClient();

  const { data: publiees } = await supabase
    .from("ladies")
    .select("id, display_name, age, display_city, display_country, headline")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(12);

  const reelles = publiees ?? [];
  const photos = await photosSignees(
    supabase,
    reelles.map((f) => f.id),
  );

  const paysDisponibles = [
    ...new Set(reelles.map((f) => f.display_country).filter(Boolean)),
  ].sort() as string[];

  const cartes = reelles.length
    ? reelles.map((f) => ({
        id: f.id,
        href: `/profils/${f.id}`,
        nom: f.display_name,
        age: f.age,
        lieu: [f.display_city, f.display_country].filter(Boolean).join(", "),
        photo: photos.get(f.id)?.[0]?.url ?? null,
      }))
    : demonstration.map((p) => ({
        id: p.id,
        href: "/inscription",
        nom: p.name,
        age: p.age as number | null,
        lieu: p.location,
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

        <div className="grid">
          {cartes.map((carte) => (
            <article className="pcard" key={carte.id}>
              <Link href={carte.href} className="pcard-photo">
                <div className="ph" />
                {carte.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={carte.photo} alt={`Profil de ${carte.nom}`} />
                ) : null}
                <span className="badge-ok">✓ Vérifié</span>
              </Link>

              <div className="pcard-body">
                <h3>
                  {carte.nom}
                  {carte.age ? `, ${carte.age}` : ""}
                </h3>
                <span className="loc">{carte.lieu}</span>
                <div className="pcard-acts">
                  <Link className="p-msg" href={carte.href}>
                    <span className="lbl-l">Envoyer un message</span>
                    <span className="lbl-s">Message</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="gal-more">
          <Link className="btn-dark" href="/profils">
            Voir tous les profils
          </Link>
        </div>
      </div>
    </section>
  );
}
