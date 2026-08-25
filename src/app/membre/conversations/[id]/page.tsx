import Link from "next/link";
import { notFound } from "next/navigation";

import Echange from "@/components/backoffice/echange";
import FilMessages from "@/components/backoffice/fil-messages";
import ModePleinEcran from "@/components/backoffice/mode-plein-ecran";
import { Avatar } from "@/components/backoffice/ui";
import { requireMember } from "@/lib/auth";
import { lireBareme } from "@/lib/credits";
import { photosPubliques } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

import FormulaireMessage from "./formulaire-message";

export default async function Conversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireMember();
  const supabase = await createClient();

  // Ces trois requêtes ne dépendent que de l'adresse et de la session : les
  // enchaîner faisait attendre trois allers-retours là où un seul suffit.
  const [{ data: conversation }, { data: messages }, { data: solde }, bareme] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", id).maybeSingle(),
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
    lireBareme(supabase),
  ]);

  if (!conversation) notFound();

  // Le second tour a besoin de savoir de quelle femme il s'agit. Ouvrir le fil
  // vaut lecture : la remise à zéro part avec, sans tour supplémentaire.
  const [{ data: femme }, photos] = await Promise.all([
    supabase
      .from("ladies")
      .select("id, display_name, age, display_city, display_country")
      .eq("id", conversation.lady_id)
      .maybeSingle(),
    photosPubliques(supabase, [conversation.lady_id]),
    conversation.member_unread > 0
      ? supabase.from("conversations").update({ member_unread: 0 }).eq("id", id)
      : Promise.resolve(),
  ]);

  if (!femme) notFound();

  const photo = photos.get(femme.id)?.[0];

  return (
    <div style={{ maxWidth: "52rem", marginInline: "auto" }}>
      <ModePleinEcran />

      <Link href="/membre" className="bo-retour bo-retour-page">
        ← Mes messages
      </Link>

      <div className="bo-carte bo-conv plein">
        <div className="bo-conv-entete">
          <Link href="/membre" className="bo-conv-retour" aria-label="Revenir aux messages">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 19 8 12l7-7" /></svg>
          </Link>
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

        <Echange>
          <FilMessages
            conversationId={conversation.id}
            monCote="member"
            vide="Écrivez le premier message. Présentez-vous simplement, cela fonctionne mieux qu'un compliment."
            initiaux={(messages ?? []).map((m) => ({
              id: m.id,
              body: m.body,
              created_at: m.created_at,
              mienne: m.sender === "member",
              attachment_path: m.attachment_path,
            }))}
          />

          <FormulaireMessage
            conversationId={conversation.id}
            prenom={femme.display_name}
            cout={bareme.message}
            solde={solde?.balance ?? 0}
          />
        </Echange>
      </div>
    </div>
  );
}
