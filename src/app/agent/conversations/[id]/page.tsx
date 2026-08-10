import Link from "next/link";
import { notFound } from "next/navigation";

import FilMessages from "@/components/backoffice/fil-messages";
import { Avatar } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import FormulaireReponse from "./formulaire-reponse";

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
      .select("id, code, display_name, age")
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

  const nomMembre = membre?.display_name ?? "Membre";

  return (
    <div style={{ maxWidth: "56rem", marginInline: "auto" }}>
      <Link href="/agent" className="bo-retour">
        ← Tous les messages
      </Link>

      <div className="bo-carte bo-conv">
        <div className="bo-conv-entete">
          <Avatar nom={nomMembre} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="bo-h2">
              {nomMembre}
              <span style={{ fontWeight: 400, color: "var(--ink-3)" }}> — conversation avec </span>
              <span style={{ color: "var(--brand)" }}>
                {femme.display_name}
                {femme.age ? `, ${femme.age}` : ""}
              </span>
            </p>
            <p style={{ marginTop: "0.15rem", fontSize: "0.78rem", color: "var(--ink-3)" }}>
              {femme.code}
              {membre?.country ? ` · membre en ${membre.country}` : ""}
            </p>
          </div>
          <Link href={`/agent/femmes/${femme.id}`} className="bo-btn fantome petit">
            Voir la fiche
          </Link>
        </div>

        <FilMessages
          conversationId={conversation.id}
          monCote="lady"
          vide="Aucun message. Vous pouvez ouvrir la conversation."
          initiaux={(messages ?? []).map((m) => {
            const auteur = m.authored_by_agent_id
              ? agentParId.get(m.authored_by_agent_id)
              : null;
            const ecritParUnAutre = Boolean(auteur && auteur.id !== agent.id);
            return {
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              mienne: m.sender === "lady",
              signature:
                m.sender === "lady" && auteur ? (ecritParUnAutre ? auteur.code : "vous") : null,
              signatureAutre: ecritParUnAutre,
            };
          })}
        />

        <FormulaireReponse conversationId={conversation.id} prenom={femme.display_name} />
      </div>
    </div>
  );
}
