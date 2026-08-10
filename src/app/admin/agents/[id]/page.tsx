import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, EtatVide, IconeFemmes, Pastille, PastilleStatut } from "@/components/backoffice/ui";
import { createClient } from "@/lib/supabase/server";

import { changerStatutAgent } from "../../actions";

export default async function FicheAgent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase.from("agents").select("*").eq("id", id).single();
  if (!agent) notFound();

  const { data: femmes } = await supabase
    .from("ladies")
    .select("id, code, display_name, age, display_country, status")
    .eq("agent_id", id)
    .order("code");

  const { count: messagesEcrits } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("authored_by_agent_id", id);

  const actif = agent.status === "active";

  return (
    <div style={{ display: "grid", gap: "1.6rem" }}>
      <div>
        <Link href="/admin/agents" className="bo-retour">
          ← Tous les agents
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Avatar nom={agent.agency_name} />
          <div>
            <h1 className="bo-titre" style={{ fontSize: "1.6rem" }}>
              {agent.agency_name}
            </h1>
            <p style={{ marginTop: "0.2rem", fontSize: "0.85rem", color: "var(--ink-3)" }}>
              {agent.code}
            </p>
          </div>
          <Pastille ton={actif ? "ok" : "neutre"}>{actif ? "Actif" : "Suspendu"}</Pastille>
        </div>
      </div>

      <div className="bo-grille" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <section className="bo-carte bo-carte-p">
          <h2 className="bo-h2">Coordonnées</h2>
          <dl className="bo-defs c2" style={{ marginTop: "1.1rem" }}>
            {(
              [
                ["Responsable", agent.contact_name],
                ["E-mail de connexion", agent.email],
                ["Téléphone", agent.phone],
                ["Pays", agent.country],
                ["Ville", agent.city],
                [
                  "Contrat cadre",
                  agent.contract_signed
                    ? `Signé le ${agent.contract_date ?? "—"}`
                    : "Non signé",
                ],
              ] as [string, string | null][]
            ).map(([libelle, valeur]) => (
              <div key={libelle}>
                <dt>{libelle}</dt>
                <dd>{valeur || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="bo-carte bo-carte-p">
          <h2 className="bo-h2">Activité</h2>
          <p style={{ marginTop: "1.1rem", fontSize: "0.8rem", color: "var(--ink-3)" }}>
            Messages rédigés
          </p>
          <p
            style={{
              fontSize: "2.4rem",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {messagesEcrits ?? 0}
          </p>
          <p style={{ marginTop: "0.35rem", fontSize: "0.79rem", color: "var(--ink-3)" }}>
            Envoyés au nom des femmes de son portefeuille.
          </p>

          <form action={changerStatutAgent} style={{ marginTop: "1.5rem" }}>
            <input type="hidden" name="agent_id" value={agent.id} />
            <input type="hidden" name="statut" value={actif ? "suspended" : "active"} />
            <button
              type="submit"
              className={`bo-btn ${actif ? "fantome" : ""}`}
              style={{ width: "100%" }}
            >
              {actif ? "Suspendre cet agent" : "Réactiver cet agent"}
            </button>
          </form>
        </section>
      </div>

      <div className="bo-carte">
        <div className="bo-carte-titre">
          <h2 className="bo-h2">
            Portefeuille · {femmes?.length ?? 0} femme{(femmes?.length ?? 0) > 1 ? "s" : ""}
          </h2>
        </div>

        {!femmes?.length ? (
          <EtatVide
            icone={IconeFemmes}
            titre="Aucune femme attribuée"
            texte="L'attribution se fait depuis la fiche de chaque femme."
          />
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Femme</th>
                  <th>Âge</th>
                  <th>Pays</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {femmes.map((femme) => (
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
                    <td>{femme.display_country ?? "—"}</td>
                    <td>
                      <PastilleStatut statut={femme.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
