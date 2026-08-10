import Link from "next/link";
import { notFound } from "next/navigation";

import TeleverserPhotos from "@/components/backoffice/televerser-photos";
import { Avatar, IconePhoto, PastilleStatut } from "@/components/backoffice/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus } from "@/lib/supabase/types";

import { attribuerFemme, changerStatutFemme, changerStatutPhoto } from "../../actions";
import FormulaireEdition from "./formulaire-edition";

const TRANSITIONS: { statut: LadyStatus; libelle: string; principal?: boolean }[] = [
  { statut: "published", libelle: "Publier", principal: true },
  { statut: "rejected", libelle: "Refuser" },
  { statut: "suspended", libelle: "Suspendre" },
  { statut: "draft", libelle: "Remettre en brouillon" },
];

export default async function FicheFemme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: femme } = await supabase.from("ladies").select("*").eq("id", id).single();
  if (!femme) notFound();

  const [{ data: prive }, { data: photos }, { data: agents }] = await Promise.all([
    supabase.from("lady_private").select("*").eq("lady_id", id).maybeSingle(),
    supabase.from("lady_photos").select("*").eq("lady_id", id).order("position"),
    supabase.from("agents").select("id, code, agency_name").order("code"),
  ]);

  // Le compartiment est privé : chaque vignette a besoin d'une URL signée,
  // valable une heure. Une photo non validée reste ainsi invisible en dehors
  // de cet écran, même si son chemin venait à circuler.
  const admin = createAdminClient();
  const vignettes = new Map<string, string>();
  for (const photo of photos ?? []) {
    const { data } = await admin.storage
      .from("lady-photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (data?.signedUrl) vignettes.set(photo.id, data.signedUrl);
  }

  const prochainePosition = (photos ?? []).reduce((max, p) => Math.max(max, p.position), 0) + 1;

  const bloquants = [
    !prive && "le dossier privé est absent",
    prive && !prive.mandate_signed && "le mandat n'est pas signé",
    prive && !prive.photo_consent && "le consentement photos manque",
    !femme.agent_id && "aucun agent n'est attribué",
    !(photos ?? []).some((p) => p.status === "approved") && "aucune photo n'est validée",
  ].filter(Boolean) as string[];

  return (
    <div style={{ display: "grid", gap: "1.6rem" }}>
      <div>
        <Link href="/admin/femmes" className="bo-retour">
          ← Toutes les femmes
        </Link>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "1rem",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Avatar nom={femme.display_name} url={vignettes.get(photos?.[0]?.id ?? "")} />
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {TRANSITIONS.filter((t) => t.statut !== femme.status).map((transition) => (
              <form action={changerStatutFemme} key={transition.statut}>
                <input type="hidden" name="lady_id" value={femme.id} />
                <input type="hidden" name="statut" value={transition.statut} />
                <button
                  type="submit"
                  className={`bo-btn ${transition.principal ? "" : "fantome"} petit`}
                >
                  {transition.libelle}
                </button>
              </form>
            ))}
          </div>
        </div>
      </div>

      {bloquants.length > 0 && femme.status !== "published" && (
        <div className="bo-encadre">
          <h3>À compléter avant publication</h3>
          <ul>
            {bloquants.map((manque) => (
              <li key={manque}>— {manque}</li>
            ))}
          </ul>
          <p>
            Rien ne vous empêche techniquement de publier : ce rappel signale seulement ce qui
            manque au dossier.
          </p>
        </div>
      )}

      <section className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Agent mandaté</h2>
        <form
          action={attribuerFemme}
          style={{
            marginTop: "1rem",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: "0.75rem",
          }}
        >
          <input type="hidden" name="lady_id" value={femme.id} />
          <div className="bo-champ" style={{ flex: 1, minWidth: 220 }}>
            <label htmlFor="agent_id">Qui la représente</label>
            <select id="agent_id" name="agent_id" defaultValue={femme.agent_id ?? ""}>
              <option value="">Aucun</option>
              {(agents ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.code} — {agent.agency_name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="bo-btn sombre">
            Attribuer
          </button>
        </form>
      </section>

      <FormulaireEdition femme={femme} prive={prive ?? null} />

      <section className="bo-carte bo-carte-p">
        <h2 className="bo-h2">Photos · {photos?.length ?? 0}</h2>
        <p className="bo-aide" style={{ fontSize: "0.9rem" }}>
          Une photo n&apos;apparaît dans la galerie publique que si elle est validée et la fiche
          publiée.
        </p>

        <div style={{ marginTop: "1.3rem" }}>
          <TeleverserPhotos
            ladyId={femme.id}
            prochainePosition={prochainePosition}
            valideDOffice
          />
        </div>

        {!photos?.length ? (
          <div className="bo-vide" style={{ padding: "2.5rem 1rem" }}>
            <span className="rond">{IconePhoto}</span>
            <h3>Aucune photo déposée</h3>
            <p>
              Déposez-les ci-dessus, ou laissez l&apos;agent mandaté les envoyer depuis son
              espace.
            </p>
          </div>
        ) : (
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
                      <span>Fichier introuvable</span>
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

                    <div className="actions">
                      {photo.status !== "approved" && (
                        <form action={changerStatutPhoto}>
                          <input type="hidden" name="photo_id" value={photo.id} />
                          <input type="hidden" name="lady_id" value={femme.id} />
                          <input type="hidden" name="statut" value="approved" />
                          <button type="submit" className="valider">
                            Valider
                          </button>
                        </form>
                      )}
                      {photo.status !== "rejected" && (
                        <form action={changerStatutPhoto}>
                          <input type="hidden" name="photo_id" value={photo.id} />
                          <input type="hidden" name="lady_id" value={femme.id} />
                          <input type="hidden" name="statut" value="rejected" />
                          <button type="submit" className="refuser">
                            Refuser
                          </button>
                        </form>
                      )}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
