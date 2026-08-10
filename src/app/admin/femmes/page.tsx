import Link from "next/link";

import { Avatar, EtatVide, IconeFemmes, PastilleStatut } from "@/components/backoffice/ui";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus } from "@/lib/supabase/types";

import FormulaireFemme from "./formulaire-femme";

const FILTRES: { valeur: LadyStatus | "tous"; libelle: string }[] = [
  { valeur: "tous", libelle: "Toutes" },
  { valeur: "pending_review", libelle: "À valider" },
  { valeur: "draft", libelle: "Brouillons" },
  { valeur: "published", libelle: "Publiées" },
  { valeur: "rejected", libelle: "Refusées" },
  { valeur: "suspended", libelle: "Suspendues" },
];

export default async function Femmes({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut: statutBrut = "tous" } = await searchParams;
  const supabase = await createClient();

  // Le filtre arrive de l'URL : on ne le passe à la requête qu'après l'avoir
  // reconnu, sinon n'importe quelle valeur atteindrait la base.
  const statut = FILTRES.find((f) => f.valeur === statutBrut)?.valeur ?? ("tous" as const);

  let requete = supabase
    .from("ladies")
    .select("id, code, display_name, age, display_city, display_country, status, agent_id")
    .order("created_at", { ascending: false });

  if (statut !== "tous") requete = requete.eq("status", statut);

  const [{ data: femmes }, { data: agents }, { data: photos }] = await Promise.all([
    requete,
    supabase.from("agents").select("id, code, agency_name").order("code"),
    supabase.from("lady_photos").select("lady_id, status"),
  ]);

  const agentParId = new Map((agents ?? []).map((a) => [a.id, a]));

  const photosParFemme = new Map<string, { total: number; enAttente: number }>();
  for (const photo of photos ?? []) {
    const compte = photosParFemme.get(photo.lady_id) ?? { total: 0, enAttente: 0 };
    compte.total += 1;
    if (photo.status === "pending") compte.enAttente += 1;
    photosParFemme.set(photo.lady_id, compte);
  }

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Femmes</h1>
          <p className="bo-sous-titre">
            Une fiche n&apos;est visible du public qu&apos;une fois publiée par vous.
          </p>
        </div>
      </div>

      <FormulaireFemme agents={agents ?? []} />

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "1.6rem 0 1.2rem" }}
      >
        {FILTRES.map((filtre) => {
          const actif = statut === filtre.valeur;
          return (
            <Link
              key={filtre.valeur}
              href={`/admin/femmes?statut=${filtre.valeur}`}
              className={`bo-btn ${actif ? "" : "fantome"} petit`}
              style={actif ? undefined : { fontWeight: 500 }}
            >
              {filtre.libelle}
            </Link>
          );
        })}
      </div>

      <div className="bo-carte">
        {!femmes?.length ? (
          <EtatVide
            icone={IconeFemmes}
            titre="Aucune fiche dans cette catégorie"
            texte="Changez de filtre, ou créez une fiche avec le formulaire ci-dessus."
          />
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Femme</th>
                  <th>Âge</th>
                  <th>Localisation</th>
                  <th>Agent</th>
                  <th>Photos</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "right" }}>Fiche</th>
                </tr>
              </thead>
              <tbody>
                {femmes.map((femme) => {
                  const agent = femme.agent_id ? agentParId.get(femme.agent_id) : null;
                  const compte = photosParFemme.get(femme.id) ?? { total: 0, enAttente: 0 };

                  return (
                    <tr key={femme.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                          <Avatar nom={femme.display_name} petit />
                          <div>
                            <Link href={`/admin/femmes/${femme.id}`} className="lien">
                              {femme.display_name}
                            </Link>
                            <span className="discret">{femme.code}</span>
                          </div>
                        </div>
                      </td>
                      <td>{femme.age ?? "—"}</td>
                      <td>
                        {[femme.display_city, femme.display_country].filter(Boolean).join(", ") ||
                          "—"}
                      </td>
                      <td>
                        {agent ? (
                          <Link href={`/admin/agents/${agent.id}`} className="lien">
                            {agent.code}
                          </Link>
                        ) : (
                          <span style={{ color: "var(--brand)" }}>non attribuée</span>
                        )}
                      </td>
                      <td>
                        {compte.total}
                        {compte.enAttente > 0 && (
                          <span className="discret" style={{ color: "var(--ambre)" }}>
                            {compte.enAttente} à modérer
                          </span>
                        )}
                      </td>
                      <td>
                        <PastilleStatut statut={femme.status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/admin/femmes/${femme.id}`} className="bo-btn fantome petit">
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
