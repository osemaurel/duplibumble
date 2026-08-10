import Link from "next/link";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus } from "@/lib/supabase/types";

const LIBELLE: Record<LadyStatus, string> = {
  draft: "Brouillon",
  pending_review: "En attente de validation",
  published: "Publiée",
  rejected: "Refusée",
  suspended: "Suspendue",
};

const COULEUR: Record<LadyStatus, string> = {
  draft: "bg-[#F1EFEB] text-[#6B6A64]",
  pending_review: "bg-[#FFF3E0] text-[#A66300]",
  published: "bg-[#E8F6EF] text-[#1B7A54]",
  rejected: "bg-[#FDECEF] text-[#B8324B]",
  suspended: "bg-[#EFEDFB] text-[#5B4BC4]",
};

export default async function MesFiches() {
  await requireAgent();
  const supabase = await createClient();

  const { data: femmes } = await supabase
    .from("ladies")
    .select("id, code, display_name, age, display_city, display_country, status, headline")
    .order("code");

  const { data: photos } = await supabase.from("lady_photos").select("lady_id, status");

  const photosParFemme = new Map<string, { total: number; validees: number }>();
  for (const photo of photos ?? []) {
    const compte = photosParFemme.get(photo.lady_id) ?? { total: 0, validees: 0 };
    compte.total += 1;
    if (photo.status === "approved") compte.validees += 1;
    photosParFemme.set(photo.lady_id, compte);
  }

  // Une fiche du portefeuille se distingue d'une fiche simplement publiée par
  // le fait qu'on puisse la modifier ; le RLS ne renvoie ici que les nôtres,
  // mais la galerie publique reste lisible par tous, y compris par nous.
  const aTraiter = (femmes ?? []).filter(
    (f) => f.status === "draft" || f.status === "rejected",
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Mes fiches</h1>
          <p className="mt-1 text-[#6B6A64]">
            Les femmes que vous représentez. Complétez, puis soumettez à la validation.
          </p>
        </div>
        {aTraiter > 0 && (
          <span className="rounded-full bg-[#FFF3E0] px-4 py-2 text-sm font-semibold text-[#A66300]">
            {aTraiter} fiche{aTraiter > 1 ? "s" : ""} à compléter
          </span>
        )}
      </div>

      {!femmes?.length ? (
        <div className="mt-6 rounded-2xl border border-[#E9E7E1] bg-white px-6 py-12 text-center">
          <p className="font-medium text-[#2E2D29]">Aucune fiche ne vous est attribuée.</p>
          <p className="mt-1 text-sm text-[#6B6A64]">
            L&apos;administration crée les fiches et vous les attribue. Contactez-la si votre
            portefeuille devrait déjà contenir des femmes.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {femmes.map((femme) => {
            const compte = photosParFemme.get(femme.id) ?? { total: 0, validees: 0 };

            return (
              <Link
                key={femme.id}
                href={`/agent/femmes/${femme.id}`}
                className="rounded-2xl border border-[#E9E7E1] bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold tracking-normal text-[#2E2D29]">
                      {femme.display_name}
                      {femme.age ? `, ${femme.age}` : ""}
                    </p>
                    <p className="text-xs text-[#9A968D]">{femme.code}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      COULEUR[femme.status]
                    }`}
                  >
                    {LIBELLE[femme.status]}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[#6B6A64]">
                  {[femme.display_city, femme.display_country].filter(Boolean).join(", ") ||
                    "Localisation à renseigner"}
                </p>

                {femme.headline ? (
                  <p className="mt-2 line-clamp-2 text-sm italic text-[#4C4B45]">
                    « {femme.headline} »
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[#B8324B]">Accroche manquante</p>
                )}

                <p className="mt-4 border-t border-[#F1EFEB] pt-3 text-xs text-[#9A968D]">
                  {compte.total} photo{compte.total > 1 ? "s" : ""} · {compte.validees} validée
                  {compte.validees > 1 ? "s" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
