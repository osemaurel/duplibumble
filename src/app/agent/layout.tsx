import Link from "next/link";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { seDeconnecter } from "./actions";

export const metadata = { title: "Espace agent | Palab" };

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const { agent } = await requireAgent();
  const supabase = await createClient();

  // Total des messages en attente sur tout le portefeuille : c'est le chiffre
  // qui doit rester sous les yeux, une conversation oubliée étant un membre
  // qui s'en va.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("agent_unread");

  const enAttente = (conversations ?? []).reduce((total, c) => total + c.agent_unread, 0);

  return (
    <div className="min-h-screen bg-[#F6F4F1]">
      <header className="bg-white border-b border-[#E9E7E1] sticky top-0 z-10">
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center gap-6">
          <Link href="/agent" className="text-xl font-bold text-[#E0314B] tracking-tight">
            Palab
          </Link>
          <span className="hidden sm:block text-xs uppercase tracking-wider text-[#9A968D] font-semibold">
            Espace agent
          </span>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/agent"
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#4C4B45] hover:bg-[#F6F4F1] flex items-center gap-2"
            >
              Messages
              {enAttente > 0 && (
                <span className="rounded-full bg-[#E0314B] text-white text-xs font-semibold px-2 py-0.5">
                  {enAttente}
                </span>
              )}
            </Link>
            <Link
              href="/agent/femmes"
              className="px-3 py-2 rounded-lg text-sm font-medium text-[#4C4B45] hover:bg-[#F6F4F1]"
            >
              Mes fiches
            </Link>
          </nav>

          <form action={seDeconnecter} className="border-l border-[#E9E7E1] pl-4">
            <button
              type="submit"
              className="text-sm font-medium text-[#9A968D] hover:text-[#E0314B]"
              title={agent.agency_name}
            >
              {agent.code} · Quitter
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
    </div>
  );
}
