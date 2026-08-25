import Link from "next/link";
import { notFound } from "next/navigation";

import { getSessionProfile } from "@/lib/auth";
import GalerieProfil from "@/components/site/galerie-profil";
import { photosPubliques } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

import { ouvrirConversation } from "../../membre/actions";

export const dynamic = "force-dynamic";

const SITUATION: Record<string, string> = {
  celibataire: "Célibataire",
  divorcee: "Divorcée",
  veuve: "Veuve",
  separee: "Séparée",
};

export default async function Profil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const session = await getSessionProfile();

  // Le RLS ne sert que les fiches publiées : une fiche en brouillon renvoie
  // une page introuvable, exactement comme une fiche qui n'existe pas.
  const { data: femme } = await supabase.from("ladies").select("*").eq("id", id).maybeSingle();
  if (!femme) notFound();

  const photos = (await photosPubliques(supabase, [femme.id])).get(femme.id) ?? [];

  const langues = Array.isArray(femme.languages)
    ? (femme.languages as unknown[]).map((l) => String(l))
    : [];

  const details: [string, string | number | null][] = [
    ["Situation", femme.marital_status ? SITUATION[femme.marital_status] : null],
    ["Enfants", femme.children],
    ["Profession", femme.profession],
    ["Études", femme.education],
    ["Taille", femme.height_cm ? `${femme.height_cm} cm` : null],
    ["Yeux", femme.eyes],
    ["Cheveux", femme.hair],
    ["Recherche", femme.seeking],
    [
      "Âge recherché",
      femme.seeking_age_min ? `${femme.seeking_age_min} – ${femme.seeking_age_max} ans` : null,
    ],
    ["Prête à déménager", femme.willing_to_relocate],
  ];

  const estMembre = session?.profile.role === "member";

  return (
    <>
      <main className="bo-main" style={{ maxWidth: 1200, marginInline: "auto" }}>
        <Link href="/profils" className="bo-retour">
          ← Tous les profils
        </Link>

        <div className="mb-profil-detail">
          <div>
            <GalerieProfil
              nom={`${femme.display_name}${femme.age ? `, ${femme.age}` : ""}`}
              photos={photos.map((photo) => ({ url: photo.url, caption: photo.caption }))}
            />
          </div>

          <div>
            <span className="bo-pastille ok">Profil vérifié</span>

            <h1 className="bo-titre" style={{ marginTop: "0.8rem" }}>
              {femme.display_name}
              {femme.age ? `, ${femme.age}` : ""}
            </h1>
            <p className="bo-sous-titre">
              {[femme.display_city, femme.display_country].filter(Boolean).join(", ")}
            </p>

            {femme.headline && <p className="mb-accroche">« {femme.headline} »</p>}

            <div className="mb-action">
              {estMembre ? (
                <form action={ouvrirConversation}>
                  <input type="hidden" name="lady_id" value={femme.id} />
                  <button type="submit" className="bo-btn">
                    Écrire à {femme.display_name}
                  </button>
                </form>
              ) : (
                <Link
                  href={`/inscription?suivant=${encodeURIComponent(`/profils/${femme.id}`)}`}
                  className="bo-btn"
                >
                  Créer un compte pour lui écrire
                </Link>
              )}
              <p className="bo-aide">
                {estMembre
                  ? "Votre message arrive directement dans sa messagerie."
                  : "L'inscription est gratuite et prend deux minutes."}
              </p>
            </div>

            {femme.bio && (
              <section className="bo-carte bo-carte-p" style={{ marginTop: "1.6rem" }}>
                <h2 className="bo-h2">Sa présentation</h2>
                <p className="mb-texte">{femme.bio}</p>
              </section>
            )}

            {femme.looking_for && (
              <section className="bo-carte bo-carte-p" style={{ marginTop: "1.1rem" }}>
                <h2 className="bo-h2">Ce qu&apos;elle recherche</h2>
                <p className="mb-texte">{femme.looking_for}</p>
              </section>
            )}

            <section className="bo-carte bo-carte-p" style={{ marginTop: "1.1rem" }}>
              <h2 className="bo-h2">En quelques mots</h2>
              <dl className="bo-defs c2" style={{ marginTop: "1.1rem" }}>
                {details
                  .filter(([, valeur]) => valeur)
                  .map(([libelle, valeur]) => (
                    <div key={libelle}>
                      <dt>{libelle}</dt>
                      <dd>{valeur}</dd>
                    </div>
                  ))}
              </dl>

              {(femme.interests ?? []).length > 0 && (
                <div style={{ marginTop: "1.3rem" }}>
                  <dt
                    style={{
                      fontSize: "0.775rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    Centres d&apos;intérêt
                  </dt>
                  <div className="mb-etiquettes">
                    {femme.interests.map((interet) => (
                      <span key={interet}>{interet}</span>
                    ))}
                  </div>
                </div>
              )}

              {langues.length > 0 && (
                <div style={{ marginTop: "1.1rem" }}>
                  <dt
                    style={{
                      fontSize: "0.775rem",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    Langues
                  </dt>
                  <div className="mb-etiquettes">
                    {langues.map((langue) => (
                      <span key={langue}>{langue}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
