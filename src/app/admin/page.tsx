import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export default async function TableauDeBord() {
  const supabase = await createClient();

  const [fichesAttente, fichesPubliees, photosAttente, agentsActifs, membres, signalements] =
    await Promise.all([
      supabase
        .from("ladies")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase
        .from("ladies")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("lady_photos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("agents").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "member"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);

  const aDecider = [
    { libelle: "Fiches à valider", valeur: fichesAttente.count ?? 0, href: "/admin/femmes?statut=pending_review" },
    { libelle: "Photos à modérer", valeur: photosAttente.count ?? 0, href: "/admin/femmes" },
    { libelle: "Signalements ouverts", valeur: signalements.count ?? 0, href: "/admin/signalements" },
  ];

  const etat = [
    { libelle: "Fiches publiées", valeur: fichesPubliees.count ?? 0, href: "/admin/femmes?statut=published" },
    { libelle: "Agents actifs", valeur: agentsActifs.count ?? 0, href: "/admin/agents" },
    { libelle: "Membres inscrits", valeur: membres.count ?? 0, href: "/admin" },
  ];

  const rienAFaire = aDecider.every((t) => t.valeur === 0);

  const etapes = [
    "Créez l'agent qui représente la femme, dans l'onglet Agents. Ses identifiants s'affichent une seule fois.",
    "Créez sa fiche, ou laissez l'agent la créer, puis attribuez-la-lui.",
    "L'agent complète la fiche, dépose les photos, et la soumet.",
    "Vous validez les photos une par une, puis vous publiez la fiche.",
  ];

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Tableau de bord</h1>
          <p className="bo-sous-titre">
            Ce qui attend une décision de votre part apparaît en premier.
          </p>
        </div>
      </div>

      <div className="bo-grille bo-grille-3">
        {aDecider.map((tuile) => (
          <Link
            key={tuile.libelle}
            href={tuile.href}
            className={`bo-tuile${tuile.valeur > 0 ? " actif" : ""}`}
          >
            <span className="libelle">{tuile.libelle}</span>
            <span className="valeur">{tuile.valeur}</span>
          </Link>
        ))}
      </div>

      {rienAFaire && (
        <p className="bo-message succes" style={{ marginTop: "1.2rem" }}>
          Rien en attente. Les fiches soumises et les photos à modérer apparaîtront ici.
        </p>
      )}

      <h2 className="bo-h2" style={{ margin: "2.4rem 0 1rem" }}>
        État de la plateforme
      </h2>
      <div className="bo-grille bo-grille-3">
        {etat.map((tuile) => (
          <Link key={tuile.libelle} href={tuile.href} className="bo-tuile">
            <span className="libelle">{tuile.libelle}</span>
            <span className="valeur">{tuile.valeur}</span>
          </Link>
        ))}
      </div>

      <div className="bo-carte bo-carte-p" style={{ marginTop: "2.4rem" }}>
        <h2 className="bo-h2">Comment se déroule l&apos;entrée d&apos;une femme</h2>
        <ol
          style={{
            listStyle: "none",
            display: "grid",
            gap: "0.85rem",
            marginTop: "1.1rem",
            fontSize: "0.93rem",
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          {etapes.map((etape, index) => (
            <li key={etape} style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 26,
                  height: 26,
                  flex: "none",
                  borderRadius: 999,
                  background: "var(--brand-soft)",
                  color: "var(--brand)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </span>
              {etape}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
