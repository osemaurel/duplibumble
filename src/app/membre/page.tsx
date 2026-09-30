import Link from "next/link";

import ListeConversations, {
  type LigneConversation,
} from "@/components/backoffice/liste-conversations";
import { EtatVide, IconeMessages } from "@/components/backoffice/ui";
import { requireMember } from "@/lib/auth";
import { photosPubliques } from "@/lib/photos";
import { apercuDe, ilYA } from "@/lib/temps";
import { createClient } from "@/lib/supabase/server";

export default async function MesMessages() {
  await requireMember();
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const ladyIds = [...new Set((conversations ?? []).map((c) => c.lady_id))];

  const [{ data: femmes }, { data: derniers }, photos] = await Promise.all([
    ladyIds.length
      ? // Ni localisation ni âge : la messagerie s'en tient au prénom. On cesse
        // donc aussi de faire descendre ce qu'on n'affiche plus.
        supabase.from("ladies").select("id, display_name").in("id", ladyIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string }[],
        }),
    supabase
      .from("messages")
      .select("conversation_id, body, sender, created_at, attachment_path")
      .order("created_at", { ascending: false })
      .limit(300),
    photosPubliques(supabase, ladyIds),
  ]);

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));

  const dernierParConversation = new Map<
    string,
    { body: string; sender: string; attachment_path: string | null }
  >();
  for (const message of derniers ?? []) {
    if (!dernierParConversation.has(message.conversation_id)) {
      dernierParConversation.set(message.conversation_id, {
        body: message.body,
        sender: message.sender,
        attachment_path: message.attachment_path,
      });
    }
  }

  const lignes: LigneConversation[] = (conversations ?? []).map((conversation) => {
    const femme = femmeParId.get(conversation.lady_id);
    const dernier = dernierParConversation.get(conversation.id);
    const texte = dernier ? apercuDe(dernier) : "";

    return {
      id: conversation.id,
      href: `/membre/conversations/${conversation.id}`,
      avatarNom: femme?.display_name ?? "?",
      avatarUrl: photos.get(conversation.lady_id)?.[0]?.url,
      qui: femme?.display_name ?? "—",
      dernier: dernier ? { texte, deMoi: dernier.sender === "member" } : null,
      vide: "Conversation ouverte, à vous d'écrire",
      dateISO: conversation.last_message_at,
      quandInitial: ilYA(conversation.last_message_at),
      nonLu: conversation.member_unread,
    };
  });

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Mes messages</h1>
          <p className="bo-sous-titre">
            Vos conversations, la plus récente en premier.
          </p>
        </div>
      </div>

      <div className="bo-carte">
        {!conversations?.length ? (
          <EtatVide
            icone={IconeMessages}
            titre="Vous n'avez pas encore de conversation"
            texte="Parcourez les profils vérifiés et écrivez à celle qui vous plaît. Vos crédits de bienvenue couvrent vos premiers messages."
            action={
              <Link href="/profils" className="bo-btn">
                Découvrir les profils
              </Link>
            }
          />
        ) : (
          <ListeConversations lignes={lignes} monCote="member" />
        )}
      </div>
    </div>
  );
}
