import Link from "next/link";

import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";
import { seDeconnecter } from "./actions";

export const metadata = { title: "Mon espace | Palab" };

export default async function MembreLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMember();
  const supabase = await createClient();

  const [{ data: solde }, { data: conversations }] = await Promise.all([
    supabase.from("credit_balances").select("balance").eq("member_id", session.userId).maybeSingle(),
    supabase.from("conversations").select("member_unread"),
  ]);

  const nonLus = (conversations ?? []).reduce((total, c) => total + c.member_unread, 0);

  return (
    <div className="bo">
      <header className="mb-barre">
        <Link href="/" className="mb-mark">
          Palab
        </Link>

        <nav className="mb-nav">
          <Link href="/profils">Profils</Link>
          <Link href="/membre">
            Messages
            {nonLus > 0 && <span className="mb-pastille">{nonLus}</span>}
          </Link>

          <span className="mb-credits" title="Vos crédits">
            {solde?.balance ?? 0} crédits
          </span>

          <form action={seDeconnecter}>
            <button type="submit" className="mb-quitter">
              Quitter
            </button>
          </form>
        </nav>
      </header>

      <main className="bo-main" style={{ maxWidth: 1100, marginInline: "auto" }}>
        {children}
      </main>
    </div>
  );
}
