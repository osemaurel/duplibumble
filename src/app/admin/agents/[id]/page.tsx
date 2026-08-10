import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { changerStatutAgent } from "../../actions";

const LIBELLE_STATUT: Record<string, string> = {
  draft: "Brouillon",
  pending_review: "À valider",
  published: "Publiée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

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
    <div className="space-y-8">
      <div>
        <Link href="/admin/agents" className="text-sm text-[#6B6A64] hover:text-[#E0314B]">
          ← Tous les agents
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#2E2D29]">
          {agent.agency_name}{" "}
          <span className="text-[#9A968D] font-medium">· {agent.code}</span>
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white border border-[#E9E7E1] p-6 lg:col-span-2">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">Coordonnées</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            {[
              ["Responsable", agent.contact_name],
              ["E-mail de connexion", agent.email],
              ["Téléphone", agent.phone],
              ["Pays", agent.country],
              ["Ville", agent.city],
              ["Contrat cadre", agent.contract_signed ? `Signé le ${agent.contract_date ?? "—"}` : "Non signé"],
            ].map(([libelle, valeur]) => (
              <div key={String(libelle)}>
                <dt className="text-[#9A968D]">{libelle}</dt>
                <dd className="mt-0.5 text-[#2E2D29]">{valeur || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl bg-white border border-[#E9E7E1] p-6">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">Activité</h2>
          <p className="mt-4 text-sm text-[#9A968D]">Messages rédigés</p>
          <p className="text-3xl font-bold tracking-normal text-[#2E2D29]">
            {messagesEcrits ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#9A968D]">
            Messages envoyés au nom des femmes de son portefeuille.
          </p>

          <form action={changerStatutAgent} className="mt-6">
            <input type="hidden" name="agent_id" value={agent.id} />
            <input type="hidden" name="statut" value={actif ? "suspended" : "active"} />
            <button
              type="submit"
              className={`w-full rounded-xl font-semibold py-2.5 text-sm transition-colors ${
                actif
                  ? "border border-[#E0314B] text-[#E0314B] hover:bg-[#FDECEF]"
                  : "bg-[#E0314B] text-white hover:bg-[#C42741]"
              }`}
            >
              {actif ? "Suspendre cet agent" : "Réactiver cet agent"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#E9E7E1] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E9E7E1]">
          <h2 className="font-semibold tracking-normal text-[#2E2D29]">
            Portefeuille · {femmes?.length ?? 0} femme{(femmes?.length ?? 0) > 1 ? "s" : ""}
          </h2>
        </div>

        {!femmes?.length ? (
          <p className="px-6 py-8 text-[#6B6A64]">
            Aucune femme attribuée. L&apos;attribution se fait depuis la fiche de chaque femme.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAF9F7] text-left text-[#6B6A64]">
              <tr>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Prénom</th>
                <th className="px-6 py-3 font-medium">Âge</th>
                <th className="px-6 py-3 font-medium">Pays</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {femmes.map((femme) => (
                <tr key={femme.id} className="border-t border-[#F1EFEB]">
                  <td className="px-6 py-4 font-medium">
                    <Link href={`/admin/femmes/${femme.id}`} className="hover:text-[#E0314B]">
                      {femme.code}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-[#2E2D29]">{femme.display_name}</td>
                  <td className="px-6 py-4 text-[#6B6A64]">{femme.age ?? "—"}</td>
                  <td className="px-6 py-4 text-[#6B6A64]">{femme.display_country ?? "—"}</td>
                  <td className="px-6 py-4 text-[#6B6A64]">
                    {LIBELLE_STATUT[femme.status] ?? femme.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
