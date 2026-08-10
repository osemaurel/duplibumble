import Link from "next/link";

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

const COULEUR_STATUT: Record<LadyStatus, string> = {
  draft: "bg-[#F1EFEB] text-[#6B6A64]",
  pending_review: "bg-[#FFF3E0] text-[#A66300]",
  published: "bg-[#E8F6EF] text-[#1B7A54]",
  rejected: "bg-[#FDECEF] text-[#B8324B]",
  suspended: "bg-[#EFEDFB] text-[#5B4BC4]",
};

const LIBELLE_STATUT: Record<LadyStatus, string> = {
  draft: "Brouillon",
  pending_review: "À valider",
  published: "Publiée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

export default async function Femmes({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut: statutBrut = "tous" } = await searchParams;
  const supabase = await createClient();

  // Le filtre arrive de l'URL : on ne le passe à la requête qu'après l'avoir
  // reconnu, sinon n'importe quelle valeur atteindrait la base.
  const statut =
    FILTRES.find((f) => f.valeur === statutBrut)?.valeur ?? ("tous" as const);

  let requete = supabase
    .from("ladies")
    .select("id, code, display_name, age, display_city, display_country, status, agent_id")
    .order("created_at", { ascending: false });

  if (statut !== "tous") {
    requete = requete.eq("status", statut);
  }

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Femmes</h1>
        <p className="mt-1 text-[#6B6A64]">
          Une fiche n&apos;est visible du public qu&apos;une fois publiée par vous.
        </p>
      </div>

      <FormulaireFemme agents={agents ?? []} />

      <div className="flex flex-wrap gap-2">
        {FILTRES.map((filtre) => {
          const actif = statut === filtre.valeur;
          return (
            <Link
              key={filtre.valeur}
              href={`/admin/femmes?statut=${filtre.valeur}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                actif
                  ? "bg-[#E0314B] text-white"
                  : "bg-white border border-[#E9E7E1] text-[#4C4B45] hover:border-[#E0314B]"
              }`}
            >
              {filtre.libelle}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border border-[#E9E7E1] overflow-hidden">
        {!femmes?.length ? (
          <p className="px-6 py-8 text-[#6B6A64]">Aucune fiche dans cette catégorie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF9F7] text-left text-[#6B6A64]">
                <tr>
                  <th className="px-6 py-3 font-medium">Code</th>
                  <th className="px-6 py-3 font-medium">Prénom</th>
                  <th className="px-6 py-3 font-medium">Âge</th>
                  <th className="px-6 py-3 font-medium">Localisation</th>
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium">Photos</th>
                  <th className="px-6 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {femmes.map((femme) => {
                  const agent = femme.agent_id ? agentParId.get(femme.agent_id) : null;
                  const compte = photosParFemme.get(femme.id) ?? { total: 0, enAttente: 0 };

                  return (
                    <tr key={femme.id} className="border-t border-[#F1EFEB] hover:bg-[#FAF9F7]">
                      <td className="px-6 py-4 font-medium">
                        <Link href={`/admin/femmes/${femme.id}`} className="hover:text-[#E0314B]">
                          {femme.code}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-[#2E2D29]">{femme.display_name}</td>
                      <td className="px-6 py-4 text-[#6B6A64]">{femme.age ?? "—"}</td>
                      <td className="px-6 py-4 text-[#6B6A64]">
                        {[femme.display_city, femme.display_country].filter(Boolean).join(", ") ||
                          "—"}
                      </td>
                      <td className="px-6 py-4 text-[#6B6A64]">
                        {agent ? (
                          <Link
                            href={`/admin/agents/${agent.id}`}
                            className="hover:text-[#E0314B]"
                          >
                            {agent.code}
                          </Link>
                        ) : (
                          <span className="text-[#B8324B]">non attribuée</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#6B6A64]">
                        {compte.total}
                        {compte.enAttente > 0 && (
                          <span className="ml-1 text-[#A66300]">
                            ({compte.enAttente} à modérer)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                            COULEUR_STATUT[femme.status]
                          }`}
                        >
                          {LIBELLE_STATUT[femme.status]}
                        </span>
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
