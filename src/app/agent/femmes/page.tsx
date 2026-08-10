import Link from "next/link";

import { Avatar, EtatVide, IconeFemmes, PastilleStatut } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  const aTraiter = (femmes ?? []).filter(
    (f) => f.status === "draft" || f.status === "rejected",
  ).length;

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Mes fiches</h1>
          <p className="bo-sous-titre">
            Les femmes que vous représentez. Complétez, puis soumettez à la validation.
          </p>
        </div>
        {aTraiter > 0 && (
          <span className="bo-pastille attente" style={{ padding: "0.5rem 0.95rem" }}>
            {aTraiter} à compléter
          </span>
        )}
      </div>

      {!femmes?.length ? (
        <div className="bo-carte">
          <EtatVide
            icone={IconeFemmes}
            titre="Aucune fiche ne vous est attribuée"
            texte="L'administration crée les fiches et vous les attribue. Contactez-la si votre portefeuille devrait déjà contenir des femmes."
          />
        </div>
      ) : (
        <div className="bo-fiches">
          {femmes.map((femme) => {
            const compte = photosParFemme.get(femme.id) ?? { total: 0, validees: 0 };

            return (
              <Link key={femme.id} href={`/agent/femmes/${femme.id}`} className="bo-fiche">
                <div className="haut">
                  <Avatar nom={femme.display_name} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="nom">
                      {femme.display_name}
                      {femme.age ? `, ${femme.age}` : ""}
                    </p>
                    <p className="code">{femme.code}</p>
                  </div>
                  <PastilleStatut statut={femme.status} />
                </div>

                <p className="lieu">
                  {[femme.display_city, femme.display_country].filter(Boolean).join(", ") ||
                    "Localisation à renseigner"}
                </p>

                {femme.headline ? (
                  <p className="accroche">« {femme.headline} »</p>
                ) : (
                  <p className="manque">Accroche manquante</p>
                )}

                <p className="pied">
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
