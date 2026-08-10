import Link from "next/link";

import NavLien from "@/components/backoffice/nav-lien";
import { IconeFemmes, IconeMessages } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import "../backoffice.css";
import { seDeconnecter } from "./actions";

export const metadata = { title: "Espace agent | Palab" };

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { agent } = await requireAgent();
  const supabase = await createClient();

  // Total des messages en attente sur tout le portefeuille : ce chiffre doit
  // rester sous les yeux, une conversation oubliée étant un membre qui s'en va.
  const { data: conversations } = await supabase.from("conversations").select("agent_unread");
  const enAttente = (conversations ?? []).reduce((total, c) => total + c.agent_unread, 0);

  return (
    <div className="bo">
      <div className="bo-shell">
        <aside className="bo-side">
          <Link href="/agent" className="bo-side-mark">
            <b>Palab</b>
            <span>Agent</span>
          </Link>

          <nav className="bo-nav">
            <NavLien href="/agent" icone={IconeMessages} compte={enAttente}>
              Messages
            </NavLien>
            <NavLien href="/agent/femmes" icone={IconeFemmes}>
              Mes fiches
            </NavLien>
          </nav>

          <div className="bo-side-pied">
            <span className="qui">
              {agent.code} · {agent.agency_name}
            </span>
            <form action={seDeconnecter}>
              <button type="submit">Déconnexion</button>
            </form>
          </div>
        </aside>

        <main className="bo-main">{children}</main>
      </div>
    </div>
  );
}
