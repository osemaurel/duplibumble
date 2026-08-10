import Link from "next/link";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function ilYA(date: string | null) {
  if (!date) return "—";
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 7) return `il y a ${jours} j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

export default async function BoiteDeReception() {
  await requireAgent();
  const supabase = await createClient();

  // Le RLS restreint déjà aux conversations du portefeuille : pas de filtre à
  // écrire ici, et rien d'autre ne peut remonter même en cas d'oubli.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const ladyIds = [...new Set((conversations ?? []).map((c) => c.lady_id))];
  const memberIds = [...new Set((conversations ?? []).map((c) => c.member_id))];

  const [{ data: femmes }, { data: membres }, { data: derniers }] = await Promise.all([
    ladyIds.length
      ? supabase.from("ladies").select("id, code, display_name, age").in("id", ladyIds)
      : Promise.resolve({ data: [] as { id: string; code: string; display_name: string; age: number | null }[] }),
    memberIds.length
      ? supabase.from("profiles").select("id, display_name, country").in("id", memberIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; country: string | null }[] }),
    supabase
      .from("messages")
      .select("conversation_id, body, sender, created_at")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));
  const membreParId = new Map((membres ?? []).map((m) => [m.id, m]));

  const dernierParConversation = new Map<string, { body: string; sender: string }>();
  for (const message of derniers ?? []) {
    if (!dernierParConversation.has(message.conversation_id)) {
      dernierParConversation.set(message.conversation_id, {
        body: message.body,
        sender: message.sender,
      });
    }
  }

  const enAttente = (conversations ?? []).filter((c) => c.agent_unread > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#2E2D29]">Messages</h1>
          <p className="mt-1 text-[#6B6A64]">
            Toutes les conversations de votre portefeuille, la plus récente en premier.
          </p>
        </div>
        {enAttente > 0 && (
          <span className="rounded-full bg-[#FDECEF] text-[#B8324B] font-semibold text-sm px-4 py-2">
            {enAttente} conversation{enAttente > 1 ? "s" : ""} en attente de réponse
          </span>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-[#E9E7E1] overflow-hidden">
        {!conversations?.length ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[#2E2D29] font-medium">Aucune conversation pour le moment.</p>
            <p className="mt-1 text-sm text-[#6B6A64]">
              Les messages arriveront dès qu&apos;un membre écrira à l&apos;une des femmes que
              vous représentez.
            </p>
            <Link
              href="/agent/femmes"
              className="mt-5 inline-block rounded-xl bg-[#E0314B] text-white font-semibold px-5 py-2.5 text-sm hover:bg-[#C42741]"
            >
              Compléter mes fiches
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1EFEB]">
            {conversations.map((conversation) => {
              const femme = femmeParId.get(conversation.lady_id);
              const membre = membreParId.get(conversation.member_id);
              const dernier = dernierParConversation.get(conversation.id);
              const nonLu = conversation.agent_unread > 0;

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/agent/conversations/${conversation.id}`}
                    className={`flex items-start gap-4 px-6 py-4 hover:bg-[#FAF9F7] transition-colors ${
                      nonLu ? "bg-[#FFFBFC]" : ""
                    }`}
                  >
                    <span
                      className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                        nonLu ? "bg-[#E0314B]" : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span
                          className={`text-[#2E2D29] ${nonLu ? "font-semibold" : "font-medium"}`}
                        >
                          {membre?.display_name ?? "Membre"}
                        </span>
                        <span className="text-sm text-[#9A968D]">écrit à</span>
                        <span className="text-sm font-medium text-[#E0314B]">
                          {femme?.display_name ?? "—"}
                          {femme?.age ? `, ${femme.age}` : ""}
                        </span>
                        {femme && (
                          <span className="text-xs text-[#C4C0B8]">{femme.code}</span>
                        )}
                      </div>

                      <p
                        className={`mt-1 truncate text-sm ${
                          nonLu ? "text-[#2E2D29]" : "text-[#6B6A64]"
                        }`}
                      >
                        {dernier
                          ? `${dernier.sender === "lady" ? "Vous : " : ""}${dernier.body}`
                          : "Pas encore de message"}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="block text-xs text-[#9A968D]">
                        {ilYA(conversation.last_message_at)}
                      </span>
                      {nonLu && (
                        <span className="mt-1 inline-block rounded-full bg-[#E0314B] text-white text-xs font-semibold px-2 py-0.5">
                          {conversation.agent_unread}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
