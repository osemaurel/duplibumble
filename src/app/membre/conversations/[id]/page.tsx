import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/backoffice/ui";
import { requireMember } from "@/lib/auth";
import { COUT_MESSAGE } from "@/lib/credits";
import { photosSignees } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

import FormulaireMessage from "./formulaire-message";

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
  const session = await requireMember();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const [{ data: femme }, { data: messages }, { data: solde }] = await Promise.all([
    supabase
      .from("ladies")
      .select("id, display_name, age, display_city, display_country")
      .eq("id", conversation.lady_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("credit_balances")
      .select("balance")
      .eq("member_id", session.userId)
      .maybeSingle(),
  ]);

  if (!femme) notFound();

  // Ouvrir le fil vaut lecture.
  if (conversation.member_unread > 0) {
    await supabase.from("conversations").update({ member_unread: 0 }).eq("id", id);
  }

  const photo = (await photosSignees(supabase, [femme.id])).get(femme.id)?.[0];

  return (
    <div style={{ maxWidth: "52rem", marginInline: "auto" }}>
      <Link href="/membre" className="bo-retour">
        ← Mes messages
      </Link>

      <div className="bo-carte bo-conv">
        <div className="bo-conv-entete">
          <Avatar nom={femme.display_name} url={photo?.url} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="bo-h2">
              {femme.display_name}
              {femme.age ? `, ${femme.age}` : ""}
            </p>
            <p style={{ marginTop: "0.15rem", fontSize: "0.78rem", color: "var(--ink-3)" }}>
              {[femme.display_city, femme.display_country].filter(Boolean).join(", ")}
            </p>
          </div>
          <Link href={`/profils/${femme.id}`} className="bo-btn fantome petit">
            Voir son profil
          </Link>
        </div>

        <div className="bo-conv-flux">
          {!messages?.length ? (
            <p
              style={{
                textAlign: "center",
                padding: "2.5rem 0",
                fontSize: "0.9rem",
                color: "var(--ink-3)",
              }}
            >
              Écrivez le premier message. Présentez-vous simplement, cela fonctionne mieux
              qu&apos;un compliment.
            </p>
          ) : (
            messages.map((message) => {
              const deMoi = message.sender === "member";
              return (
                <div key={message.id} className={`bo-bulle-rangee ${deMoi ? "mienne" : "sienne"}`}>
                  <div className="bo-bulle">
                    <div className="texte">{message.body}</div>
                    <p className="meta">{heure(message.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <FormulaireMessage
          conversationId={conversation.id}
          prenom={femme.display_name}
          cout={COUT_MESSAGE}
          solde={solde?.balance ?? 0}
        />
      </div>
    </div>
  );
}
