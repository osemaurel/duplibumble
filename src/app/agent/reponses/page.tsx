import { EtatVide, IconeReponses } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { supprimerReponseType } from "../actions";
import FormulaireReponseType from "./formulaire-reponse-type";

export default async function ReponsesTypes() {
  const { agent } = await requireAgent();
  const supabase = await createClient();

  const { data: modeles } = await supabase
    .from("reponses_types")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Réponses types</h1>
          <p className="bo-sous-titre">
            Des messages prêts à l&apos;emploi, à choisir depuis n&apos;importe quelle
            conversation sans les retaper.
          </p>
        </div>
      </div>

      <FormulaireReponseType />

      <div className="bo-carte">
        <div className="bo-carte-titre">
          <h2 className="bo-h2">Vos modèles · {modeles?.length ?? 0}</h2>
        </div>

        {!modeles?.length ? (
          <EtatVide
            icone={IconeReponses}
            titre="Aucune réponse type pour l'instant"
            texte="Créez-en une ci-dessus : elle apparaîtra ensuite dans chaque conversation."
          />
        ) : (
          <ul className="bo-liste-simple">
            {modeles.map((modele) => (
              <li
                key={modele.id}
                style={{
                  padding: "1.1rem 1.6rem",
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600 }}>{modele.libelle}</p>
                  <p
                    style={{
                      marginTop: "0.3rem",
                      fontSize: "0.86rem",
                      color: "var(--ink-2)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {modele.corps}
                  </p>
                </div>
                <form action={supprimerReponseType}>
                  <input type="hidden" name="id" value={modele.id} />
                  <button type="submit" className="bo-btn fantome petit">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
