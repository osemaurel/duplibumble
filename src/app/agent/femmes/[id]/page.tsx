import Link from "next/link";
import { notFound } from "next/navigation";

import TeleverserPhotos from "@/components/backoffice/televerser-photos";
import { Avatar, IconePhoto, PastilleStatut } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { soumettreFiche, supprimerPhoto } from "../../actions";
import FormulaireFiche from "./formulaire-fiche";

export default async function FicheFemmeAgent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { agent } = await requireAgent();
  const supabase = await createClient();

  const { data: femme } = await supabase.from("ladies").select("*").eq("id", id).maybeSingle();
  if (!femme) notFound();

  // La galerie publique est lisible par tous : une fiche publiée d'un confrère
  // remonterait donc ici sans être modifiable. On l'écarte explicitement — un
  // formulaire sans effet est pire qu'une porte fermée.
  if (femme.agent_id !== agent.id) notFound();

  const [{ data: prive }, { data: photos }] = await Promise.all([
    supabase.from("lady_private").select("*").eq("lady_id", id).maybeSingle(),
    supabase.from("lady_photos").select("*").eq("lady_id", id).order("position"),
  ]);

  const vignettes = new Map<string, string>();
  for (const photo of photos ?? []) {
    const { data } = await supabase.storage
      .from("lady-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) vignettes.set(photo.id, data.signedUrl);
  }

  const prochainePosition = (photos ?? []).reduce((max, p) => Math.max(max, p.position), 0) + 1;

  const manques = [
    !femme.headline && "l'accroche",
    !femme.bio && "la présentation",
    !femme.looking_for && "le texte « ce qu'elle recherche »",
    !femme.display_country && "le pays",
    (photos ?? []).length < 4 && "au moins quatre photos",
    !prive?.mandate_signed && "le mandat signé (à faire remonter à l'administration)",
  ].filter(Boolean) as string[];

  const soumissionPossible = femme.status === "draft" || femme.status === "rejected";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div>
        <Link href="/agent/femmes" className="bo-retour">
          ← Mes fiches
        </Link>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Avatar nom={femme.display_name} />
            <div>
              <h1 className="bo-titre" style={{ fontSize: "1.6rem" }}>
                {femme.display_name}
                {femme.age ? `, ${femme.age}` : ""}
              </h1>
              <p style={{ marginTop: "0.2rem", fontSize: "0.85rem", color: "var(--ink-3)" }}>
                {femme.code}
              </p>
            </div>
            <PastilleStatut statut={femme.status} />
          </div>

          {soumissionPossible && (
            <form action={soumettreFiche}>
              <input type="hidden" name="lady_id" value={femme.id} />
              <button type="submit" className="bo-btn">
                Soumettre à la validation
              </button>
            </form>
          )}
        </div>
      </div>

      {femme.status === "pending_review" && (
        <p className="bo-message avertissement">
          Fiche transmise à l&apos;administration. Vous pouvez continuer à la modifier ; la
          publication ne dépend plus que de sa validation.
        </p>
      )}

      {femme.status === "rejected" && (
        <p className="bo-message erreur">
          Fiche refusée par l&apos;administration. Corrigez ce qui a été signalé, puis
          soumettez-la de nouveau.
        </p>
      )}

      {manques.length > 0 && femme.status !== "published" && (
        <div className="bo-encadre">
          <h3>Il manque encore</h3>
          <ul>
            {manques.map((manque) => (
              <li key={manque}>— {manque}</li>
            ))}
          </ul>
          <p>
            Rien ne vous empêche de soumettre malgré tout : une fiche incomplète a simplement
            peu de chances d&apos;être publiée.
          </p>
        </div>
      )}

      <FormulaireFiche femme={femme} />

      <section className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Photos · {photos?.length ?? 0}</h2>
        <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
          Chaque photo est validée une par une par l&apos;administration avant d&apos;apparaître
          publiquement.
        </p>

        <div style={{ marginTop: "1.3rem" }}>
          <TeleverserPhotos ladyId={femme.id} prochainePosition={prochainePosition} />
        </div>

        {photos?.length ? (
          <div className="bo-photos" style={{ marginTop: "1.4rem" }}>
            {photos.map((photo) => {
              const url = vignettes.get(photo.id);
              return (
                <figure key={photo.id} className="bo-photo">
                  <div className="cadre">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={`Photo ${photo.position}`} />
                    ) : (
                      <span>Aperçu indisponible</span>
                    )}
                  </div>

                  <figcaption className="infos">
                    <div className="rangee">
                      <span className="pos">
                        {photo.position === 1 ? "Principale" : `Photo ${photo.position}`}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            photo.status === "approved"
                              ? "var(--vert)"
                              : photo.status === "rejected"
                                ? "var(--brand-dark)"
                                : "var(--ambre)",
                        }}
                      >
                        {photo.status === "approved"
                          ? "Validée"
                          : photo.status === "rejected"
                            ? "Refusée"
                            : "En attente"}
                      </span>
                    </div>

                    {photo.rejection_note && (
                      <p
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.76rem",
                          color: "var(--brand-dark)",
                        }}
                      >
                        {photo.rejection_note}
                      </p>
                    )}

                    <div className="actions">
                      <form action={supprimerPhoto}>
                        <input type="hidden" name="photo_id" value={photo.id} />
                        <input type="hidden" name="lady_id" value={femme.id} />
                        <input type="hidden" name="storage_path" value={photo.storage_path} />
                        <button type="submit" className="refuser">
                          Retirer
                        </button>
                      </form>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <div className="bo-vide" style={{ padding: "2.5rem 1rem" }}>
            <span className="rond">{IconePhoto}</span>
            <h3>Aucune photo pour l&apos;instant</h3>
            <p>Six à dix photos verticales donnent le meilleur résultat.</p>
          </div>
        )}
      </section>

      <section className="bo-prive">
        <h2 className="bo-h2">
          Dossier interne
          <span className="etiquette">jamais publié</span>
        </h2>
        <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
          Ces informations servent à la vérification. Pour les corriger, passez par
          l&apos;administration.
        </p>

        <dl className="bo-defs c3" style={{ marginTop: "1.2rem" }}>
          {(
            [
              ["Nom légal", prive?.legal_name ?? null],
              ["Date de naissance", prive?.birth_date ?? null],
              ["Nationalité", prive?.nationality ?? null],
              [
                "Résidence",
                [prive?.residence_city, prive?.residence_country].filter(Boolean).join(", ") ||
                  null,
              ],
              ["Mandat signé", prive?.mandate_signed ? "Oui" : "Non"],
              ["Consentement photos", prive?.photo_consent ? "Oui" : "Non"],
            ] as [string, string | null][]
          ).map(([libelle, valeur]) => (
            <div key={libelle}>
              <dt>{libelle}</dt>
              <dd>{valeur || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
