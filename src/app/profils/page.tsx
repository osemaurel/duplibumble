import Link from "next/link";

import { getSessionProfile } from "@/lib/auth";
import { photosSignees } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";

export const metadata = {
  title: "Profils vérifiés | Palab",
  description:
    "Parcourez les profils de femmes vérifiées une à une par l'équipe Palab, puis lancez la conversation.",
};

export const dynamic = "force-dynamic";

export default async function Profils({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; age?: string }>;
}) {
  const { pays = "", age = "" } = await searchParams;
  const supabase = await createClient();
  const session = await getSessionProfile();

  // Le RLS ne laisse sortir que les fiches publiées : le filtre de statut est
  // dans la base, pas dans cette requête.
  let requete = supabase
    .from("ladies")
    .select("id, code, display_name, age, display_city, display_country, headline, seeking")
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (pays) requete = requete.eq("display_country", pays);

  const { data: toutes } = await requete;

  const tranches: Record<string, [number, number]> = {
    "18-25": [18, 25],
    "26-35": [26, 35],
    "36-45": [36, 45],
    "46+": [46, 99],
  };

  const femmes = (toutes ?? []).filter((f) => {
    if (!age || !tranches[age]) return true;
    const [min, max] = tranches[age];
    return f.age !== null && f.age >= min && f.age <= max;
  });

  const photos = await photosSignees(
    supabase,
    femmes.map((f) => f.id),
  );

  const paysDisponibles = [
    ...new Set((toutes ?? []).map((f) => f.display_country).filter(Boolean)),
  ].sort() as string[];

  return (
    <div className="bo">
      <header className="mb-barre">
        <Link href="/" className="mb-mark">
          Palab
        </Link>
        <nav className="mb-nav">
          <Link href="/profils" aria-current="page">
            Profils
          </Link>
          {session ? (
            <Link href="/membre" className="bo-btn petit">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/connexion">Se connecter</Link>
              <Link href="/inscription" className="bo-btn petit">
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="bo-main" style={{ maxWidth: 1400, marginInline: "auto" }}>
        <div className="bo-entete">
          <div>
            <h1 className="bo-titre">Elles sont vérifiées, une par une</h1>
            <p className="bo-sous-titre">
              Chaque fiche a été contrôlée par notre équipe avant publication : identité, photos
              et intentions.
            </p>
          </div>
        </div>

        <form className="mb-filtres" method="get">
          <div className="bo-champ">
            <label htmlFor="pays">Pays</label>
            <select id="pays" name="pays" defaultValue={pays}>
              <option value="">Tous les pays</option>
              {paysDisponibles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="bo-champ">
            <label htmlFor="age">Âge</label>
            <select id="age" name="age" defaultValue={age}>
              <option value="">Tous les âges</option>
              {Object.keys(tranches).map((t) => (
                <option key={t} value={t}>
                  {t} ans
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="bo-btn">
            Filtrer
          </button>
        </form>

        {!femmes.length ? (
          <div className="bo-carte" style={{ marginTop: "1.6rem" }}>
            <div className="bo-vide">
              <h3>Aucun profil publié pour le moment</h3>
              <p>
                Les fiches apparaissent ici dès qu&apos;elles ont été vérifiées et publiées par
                notre équipe. Revenez d&apos;ici peu.
              </p>
              {!session && (
                <Link href="/inscription" className="bo-btn">
                  Créer mon compte
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-galerie">
            {femmes.map((femme) => {
              const principale = photos.get(femme.id)?.[0];

              return (
                <Link key={femme.id} href={`/profils/${femme.id}`} className="mb-profil">
                  <div className="photo">
                    {principale ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={principale.url} alt={`${femme.display_name}, ${femme.age}`} />
                    ) : (
                      <span className="sans-photo">Photo à venir</span>
                    )}
                    <span className="verifie">✓ Vérifié</span>
                  </div>

                  <div className="corps">
                    <p className="nom">
                      {femme.display_name}
                      {femme.age ? `, ${femme.age}` : ""}
                    </p>
                    <p className="lieu">
                      {[femme.display_city, femme.display_country].filter(Boolean).join(", ")}
                    </p>
                    {femme.headline && <p className="accroche">{femme.headline}</p>}
                    <span className="bo-btn petit" style={{ marginTop: "0.9rem" }}>
                      Voir le profil
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
