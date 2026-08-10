import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function TableauDeBord() {
  const supabase = await createClient();

  const [
    fichesAttente,
    fichesPubliees,
    photosAttente,
    agentsActifs,
    membres,
    signalements,
  ] = await Promise.all([
    supabase.from("ladies").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("ladies").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("lady_photos").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("agents").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const tuiles = [
    {
      libelle: "Fiches à valider",
      valeur: fichesAttente.count ?? 0,
      href: "/admin/femmes?statut=pending_review",
      accent: true,
    },
    {
      libelle: "Photos à modérer",
      valeur: photosAttente.count ?? 0,
      href: "/admin/femmes",
      accent: true,
    },
    { libelle: "Signalements ouverts", valeur: signalements.count ?? 0, href: "/admin/signalements", accent: true },
    { libelle: "Fiches publiées", valeur: fichesPubliees.count ?? 0, href: "/admin/femmes?statut=published" },
    { libelle: "Agents actifs", valeur: agentsActifs.count ?? 0, href: "/admin/agents" },
    { libelle: "Membres inscrits", valeur: membres.count ?? 0, href: "/admin" },
  ];

  const rienAFaire =
    (fichesAttente.count ?? 0) === 0 &&
    (photosAttente.count ?? 0) === 0 &&
    (signalements.count ?? 0) === 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Tableau de bord</h1>
      <p className="mt-1 text-[#6B6A64]">
        Ce qui attend une décision de votre part apparaît en premier.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((tuile) => (
          <Link
            key={tuile.libelle}
            href={tuile.href}
            className={`rounded-2xl bg-white p-6 border transition-shadow hover:shadow-md ${
              tuile.accent && tuile.valeur > 0 ? "border-[#E0314B]" : "border-[#E9E7E1]"
            }`}
          >
            <span className="block text-sm font-medium text-[#6B6A64]">{tuile.libelle}</span>
            <span
              className={`mt-2 block text-4xl font-bold tracking-normal ${
                tuile.accent && tuile.valeur > 0 ? "text-[#E0314B]" : "text-[#2E2D29]"
              }`}
            >
              {tuile.valeur}
            </span>
          </Link>
        ))}
      </div>

      {rienAFaire && (
        <p className="mt-6 rounded-2xl bg-white border border-[#E9E7E1] p-6 text-[#6B6A64]">
          Rien en attente. Les fiches soumises par les agents et les photos à modérer
          apparaîtront ici.
        </p>
      )}

      <div className="mt-10 rounded-2xl bg-white border border-[#E9E7E1] p-6">
        <h2 className="text-lg font-semibold tracking-normal text-[#2E2D29]">
          Comment se déroule l&apos;entrée d&apos;une femme
        </h2>
        <ol className="mt-4 space-y-3 text-[#4C4B45] text-sm leading-relaxed">
          <li>
            <b>1.</b> Vous créez l&apos;agent qui la représente, dans l&apos;onglet Agents. Ses
            identifiants de connexion s&apos;affichent une seule fois.
          </li>
          <li>
            <b>2.</b> Vous créez sa fiche, ou l&apos;agent la crée depuis son espace, et vous la
            lui attribuez.
          </li>
          <li>
            <b>3.</b> L&apos;agent complète la fiche et dépose les photos, puis la soumet.
          </li>
          <li>
            <b>4.</b> Vous validez les photos une par une, puis vous publiez la fiche. Elle
            apparaît alors dans la galerie publique.
          </li>
        </ol>
      </div>
    </div>
  );
}
