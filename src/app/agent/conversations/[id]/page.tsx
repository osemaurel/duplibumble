import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import FormulaireReponse from "./formulaire-reponse";

function heure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { agent } = await requireAgent();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // Absente ou hors portefeuille : le RLS ne fait pas la différence, et c'est
  // voulu — un agent ne doit pas pouvoir déduire l'existence d'une
  // conversation qui ne le regarde pas.
  if (!conversation) notFound();

  const [{ data: femme }, { data: membre }, { data: messages }] = await Promise.all([
    supabase
      .from("ladies")
      .select("id, code, display_name, age, display_city, display_country, status")
      .eq("id", conversation.lady_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, display_name, country")
      .eq("id", conversation.member_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!femme) notFound();

  // Ouvrir le fil vaut lecture.
  if (conversation.agent_unread > 0) {
    await supabase.from("conversations").update({ agent_unread: 0 }).eq("id", id);
  }

  const agentsIds = [
    ...new Set(
      (messages ?? [])
        .map((m) => m.authored_by_agent_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: agents } = agentsIds.length
    ? await supabase.from("agents").select("id, code").in("id", agentsIds)
    : { data: [] as { id: string; code: string }[] };
  const agentParId = new Map((agents ?? []).map((a) => [a.id, a]));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/agent" className="text-sm text-[#6B6A64] hover:text-[#E0314B]">
        ← Tous les messages
      </Link>

      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E9E7E1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E7E1] px-6 py-4">
          <div>
            <p className="font-semibold tracking-normal text-[#2E2D29]">
              {membre?.display_name ?? "Membre"}
              <span className="font-normal text-[#9A968D]"> — conversation avec </span>
              <span className="text-[#E0314B]">
                {femme.display_name}
                {femme.age ? `, ${femme.age}` : ""}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[#9A968D]">
              {femme.code}
              {membre?.country ? ` · membre en ${membre.country}` : ""}
            </p>
          </div>

          <Link
            href={`/agent/femmes/${femme.id}`}
            className="rounded-lg border border-[#E9E7E1] px-3 py-1.5 text-sm font-medium text-[#4C4B45] hover:border-[#E0314B]"
          >
            Voir la fiche
          </Link>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-[#FAF9F7] px-6 py-6">
          {!messages?.length ? (
            <p className="py-8 text-center text-sm text-[#9A968D]">
              Aucun message. Vous pouvez ouvrir la conversation.
            </p>
          ) : (
            messages.map((message) => {
              const deLaFemme = message.sender === "lady";
              const auteur = message.authored_by_agent_id
                ? agentParId.get(message.authored_by_agent_id)
                : null;
              const ecritParUnAutre = Boolean(auteur && auteur.id !== agent.id);

              return (
                <div
                  key={message.id}
                  className={`flex ${deLaFemme ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        deLaFemme
                          ? "bg-[#E0314B] text-white"
                          : "border border-[#E9E7E1] bg-white text-[#2E2D29]"
                      }`}
                    >
                      {message.body}
                    </div>

                    <p
                      className={`mt-1 text-xs text-[#9A968D] ${
                        deLaFemme ? "text-right" : ""
                      }`}
                    >
                      {heure(message.created_at)}
                      {deLaFemme && auteur && (
                        <span className={ecritParUnAutre ? " text-[#B8324B]" : ""}>
                          {" · rédigé par "}
                          {ecritParUnAutre ? auteur.code : "vous"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <FormulaireReponse conversationId={conversation.id} prenom={femme.display_name} />
      </div>
    </div>
  );
}
