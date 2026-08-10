import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { changerStatutAgent } from "../actions";
import FormulaireAgent from "./formulaire-agent";

export default async function Agents() {
  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("code", { ascending: true });

  // Le portefeuille de chaque agent, compté en une seule requête plutôt qu'une
  // par ligne du tableau.
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Agents</h1>
        <p className="mt-1 text-[#6B6A64]">
          Chaque agent représente légalement un lot de femmes et répond à leurs messages en leur
          nom, dans le cadre du mandat signé.
        </p>
      </div>

      <FormulaireAgent />

      <div className="rounded-2xl bg-white border border-[#E9E7E1] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E9E7E1]">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">
            {agents?.length ?? 0} agent{(agents?.length ?? 0) > 1 ? "s" : ""}
          </h2>
        </div>

        {!agents?.length ? (
          <p className="px-6 py-8 text-[#6B6A64]">
            Aucun agent pour l&apos;instant. Créez le premier avec le formulaire ci-dessus.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF9F7] text-left text-[#6B6A64]">
                <tr>
                  <th className="px-6 py-3 font-medium">Code</th>
                  <th className="px-6 py-3 font-medium">Agence</th>
                  <th className="px-6 py-3 font-medium">Contact</th>
                  <th className="px-6 py-3 font-medium">Portefeuille</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const compte = portefeuille.get(agent.id) ?? { total: 0, publiees: 0 };
                  const actif = agent.status === "active";

                  return (
                    <tr key={agent.id} className="border-t border-[#F1EFEB]">
                      <td className="px-6 py-4 font-medium text-[#2E2D29]">
                        <Link href={`/admin/agents/${agent.id}`} className="hover:text-[#E0314B]">
                          {agent.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#2E2D29]">{agent.agency_name}</td>
                      <td className="px-6 py-4 text-[#6B6A64]">
                        {agent.email}
                        {agent.country && <span className="block text-xs">{agent.country}</span>}
                      </td>
                      <td className="px-6 py-4 text-[#4C4B45]">
                        {compte.total} femme{compte.total > 1 ? "s" : ""}
                        <span className="block text-xs text-[#9A968D]">
                          dont {compte.publiees} publiée{compte.publiees > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            actif ? "bg-[#E8F6EF] text-[#1B7A54]" : "bg-[#F1EFEB] text-[#6B6A64]"
                          }`}
                        >
                          {actif ? "Actif" : "Suspendu"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <form action={changerStatutAgent}>
                          <input type="hidden" name="agent_id" value={agent.id} />
                          <input
                            type="hidden"
                            name="statut"
                            value={actif ? "suspended" : "active"}
                          />
                          <button
                            type="submit"
                            className="text-sm font-medium text-[#6B6A64] hover:text-[#E0314B]"
                          >
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
