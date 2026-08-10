import Link from "next/link";

import NavLien from "@/components/backoffice/nav-lien";
import {
  IconeAgents,
  IconeFemmes,
  IconeSignalements,
  IconeTableau,
} from "@/components/backoffice/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";
import { seDeconnecter } from "./actions";

export const metadata = { title: "Administration | Palab" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const supabase = await createClient();

  // Les compteurs de la navigation : ce qui attend une décision doit se voir
  // depuis n'importe quel écran, sans avoir à repasser par le tableau de bord.
  const [fiches, photos, signalements] = await Promise.all([
    supabase
      .from("ladies")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review"),
    supabase
      .from("lady_photos")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const liens = [
    { href: "/admin", label: "Tableau de bord", icone: IconeTableau, compte: 0 },
    { href: "/admin/femmes", label: "Femmes", icone: IconeFemmes, compte: fiches.count ?? 0 },
    { href: "/admin/agents", label: "Agents", icone: IconeAgents, compte: 0 },
    {
      href: "/admin/signalements",
      label: "Signalements",
      icone: IconeSignalements,
      compte: signalements.count ?? 0,
    },
  ];

  return (
    <div className="bo">
      <div className="bo-shell">
        <aside className="bo-side">
          <Link href="/admin" className="bo-side-mark">
            <b>Palab</b>
            <span>Admin</span>
          </Link>

          <nav className="bo-nav">
            {liens.map((lien) => (
              <NavLien
                key={lien.href}
                href={lien.href}
                icone={lien.icone}
                compte={lien.compte}
              >
                {lien.label}
              </NavLien>
            ))}
          </nav>

          <div className="bo-side-pied">
            <span className="qui">{session.email}</span>
            <form action={seDeconnecter}>
              <button type="submit">Déconnexion</button>
            </form>
          </div>
        </aside>

        <main className="bo-main">
          {(photos.count ?? 0) > 0 && (
            <p className="bo-message avertissement" style={{ marginBottom: "1.6rem" }}>
              {photos.count} photo{(photos.count ?? 0) > 1 ? "s" : ""} en attente de
              modération.
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
