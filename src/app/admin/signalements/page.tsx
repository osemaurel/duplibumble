import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

const LIBELLE_STATUT: Record<string, string> = {
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
    : { data: [] };

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Signalements</h1>
        <p className="mt-1 text-[#6B6A64]">
          Remontés par les membres depuis une fiche ou une conversation.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[#E9E7E1] overflow-hidden">
        {!signalements?.length ? (
          <p className="px-6 py-8 text-[#6B6A64]">Aucun signalement. C&apos;est bon signe.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#FAF9F7] text-left text-[#6B6A64]">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Fiche visée</th>
                <th className="px-6 py-3 font-medium">Motif</th>
                <th className="px-6 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {signalements.map((signalement) => {
                const femme = signalement.lady_id ? femmeParId.get(signalement.lady_id) : null;
                return (
                  <tr key={signalement.id} className="border-t border-[#F1EFEB]">
                    <td className="px-6 py-4 text-[#6B6A64]">
                      {new Date(signalement.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      {femme ? (
                        <Link
                          href={`/admin/femmes/${femme.id}`}
                          className="font-medium hover:text-[#E0314B]"
                        >
                          {femme.code} — {femme.display_name}
                        </Link>
                      ) : (
                        <span className="text-[#9A968D]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#2E2D29]">
                      {signalement.reason}
                      {signalement.details && (
                        <span className="block text-xs text-[#6B6A64] mt-1">
                          {signalement.details}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#6B6A64]">
                      {LIBELLE_STATUT[signalement.status] ?? signalement.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
