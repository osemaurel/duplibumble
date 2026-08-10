import Link from "next/link";

import { EtatVide, IconeSignalements, Pastille } from "@/components/backoffice/ui";
import { createClient } from "@/lib/supabase/server";

const TON: Record<string, "neutre" | "attente" | "ok" | "refus"> = {
  open: "refus",
  reviewing: "attente",
  resolved: "ok",
  dismissed: "neutre",
};

const LIBELLE: Record<string, string> = {
  open: "Ouvert",
  reviewing: "En cours",
  resolved: "Résolu",
  dismissed: "Écarté",
};

export default async function Signalements() {
  const supabase = await createClient();

  const { data: signalements } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  const ladyIds = [...new Set((signalements ?? []).map((s) => s.lady_id).filter(Boolean))];
  const { data: femmes } = ladyIds.length
    ? await supabase.from("ladies").select("id, code, display_name").in("id", ladyIds as string[])
    : { data: [] as { id: string; code: string; display_name: string }[] };

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Signalements</h1>
          <p className="bo-sous-titre">
            Remontés par les membres depuis une fiche ou une conversation.
          </p>
        </div>
      </div>

      <div className="bo-carte">
        {!signalements?.length ? (
          <EtatVide
            icone={IconeSignalements}
            titre="Aucun signalement"
            texte="C'est bon signe. Les remontées des membres apparaîtront ici, la plus récente en premier."
          />
        ) : (
          <div className="bo-table-enveloppe">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fiche visée</th>
                  <th>Motif</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {signalements.map((signalement) => {
                  const femme = signalement.lady_id ? femmeParId.get(signalement.lady_id) : null;
                  return (
                    <tr key={signalement.id}>
                      <td>{new Date(signalement.created_at).toLocaleDateString("fr-FR")}</td>
                      <td>
                        {femme ? (
                          <Link href={`/admin/femmes/${femme.id}`} className="lien">
                            {femme.display_name}
                            <span className="discret">{femme.code}</span>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className="fort">{signalement.reason}</span>
                        {signalement.details && (
                          <span className="discret">{signalement.details}</span>
                        )}
                      </td>
                      <td>
                        <Pastille ton={TON[signalement.status] ?? "neutre"}>
                          {LIBELLE[signalement.status] ?? signalement.status}
                        </Pastille>
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
