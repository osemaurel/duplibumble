import Link from "next/link";

import { Avatar, EtatVide, IconeAgents, Pastille } from "@/components/backoffice/ui";
import { createClient } from "@/lib/supabase/server";

import { changerStatutAgent } from "../actions";
import FormulaireAgent from "./formulaire-agent";

export default async function Agents() {
  const supabase = await createClient();

  const { data: agents } = await supabase.from("agents").select("*").order("code");

  // Le portefeuille de chaque agent, compté en une requête plutôt qu'une par
  // ligne du tableau.
  const { data: femmes } = await supabase.from("ladies").select("agent_id, status");

  const portefeuille = new Map<string, { total: number; publiees: number }>();
  for (const femme of femmes ?? []) {
    if (!femme.agent_id) continue;
    const compte = portefeuille.get(femme.agent_id) ?? { total: 0, publiees: 0 };
    compte.total += 1;
    if (femme.status === "published") compte.publiees += 1;
    portefeuille.set(femme.agent_id, compte);
  }

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Agents</h1>
          <p className="bo-sous-titre">
            Chaque agent représente légalement un lot de femmes et répond à leurs messages en
            leur nom, dans le cadre du mandat signé.
          </p>
        </div>
      </div>

      <FormulaireAgent />

      <div className="bo-carte" style={{ marginTop: "1.6rem" }}>
        <div className="bo-carte-titre">
          <h2 className="bo-h2">
            {agents?.length ?? 0} agent{(agents?.length ?? 0) > 1 ? "s" : ""}
          </h2>
        </div>

        {!agents?.length ? (
          <EtatVide
            icone={IconeAgents}
            titre="Aucun agent pour l'instant"
            texte="Créez le premier avec le formulaire ci-dessus. Son compte est ouvert immédiatement."
          />
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Agence</th>
                  <th>Contact</th>
                  <th>Portefeuille</th>
                  <th>Statut</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const compte = portefeuille.get(agent.id) ?? { total: 0, publiees: 0 };
                  const actif = agent.status === "active";

                  return (
                    <tr key={agent.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                          <Avatar nom={agent.agency_name} petit />
                          <div>
                            <Link href={`/admin/agents/${agent.id}`} className="lien">
                              {agent.agency_name}
                            </Link>
                            <span className="discret">{agent.code}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {agent.email}
                        {(agent.contact_name || agent.country) && (
                          <span className="discret">
                            {[agent.contact_name, agent.country].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="fort">{compte.total}</span> femme
                        {compte.total > 1 ? "s" : ""}
                        <span className="discret">
                          dont {compte.publiees} publiée{compte.publiees > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <Pastille ton={actif ? "ok" : "neutre"}>
                          {actif ? "Actif" : "Suspendu"}
                        </Pastille>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <form action={changerStatutAgent}>
                          <input type="hidden" name="agent_id" value={agent.id} />
                          <input
                            type="hidden"
                            name="statut"
                            value={actif ? "suspended" : "active"}
                          />
                          <button type="submit" className="bo-lien-action">
                            {actif ? "Suspendre" : "Réactiver"}
                          </button>
                        </form>
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
