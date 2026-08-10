import Link from "next/link";

import BarreOnglets from "@/components/membre/barre-onglets";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";

export const metadata = { title: "Mon espace | Palab" };

export default async function MembreLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();
  const supabase = await createClient();

  const [{ data: solde }, { data: conversations }] = await Promise.all([
    supabase
      .from("credit_balances")
      .select("balance")
      .eq("member_id", session.userId)
      .maybeSingle(),
    supabase.from("conversations").select("member_unread"),
  ]);

  const nonLus = (conversations ?? []).reduce((total, c) => total + c.member_unread, 0);

  return (
    <div className="bo">
      {/* Sur téléphone l'en-tête ne garde que l'essentiel : la navigation
          descend en bas de l'écran, à portée du pouce. */}
      <header className="mb-barre">
        <Link href="/" className="mb-mark">
          Palab
        </Link>

        <nav className="mb-nav">
          <Link href="/profils" className="sur-large">
            Profils
          </Link>
          <Link href="/membre" className="sur-large">
            Messages
            {nonLus > 0 && <span className="mb-pastille">{nonLus}</span>}
          </Link>

          <Link href="/membre/compte" className="mb-credits" title="Mes crédits">
            {solde?.balance ?? 0} crédits
          </Link>

          <Link href="/membre/compte" className="sur-large mb-quitter">
            Mon compte
          </Link>
        </nav>
      </header>

      <main className="bo-main mb-contenu" style={{ maxWidth: 1100, marginInline: "auto" }}>
        {children}
      </main>

      <BarreOnglets nonLus={nonLus} />
    </div>
  );
}
