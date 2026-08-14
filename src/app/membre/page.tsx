import Link from "next/link";

import { Avatar, EtatVide, IconeMessages } from "@/components/backoffice/ui";
import { requireMember } from "@/lib/auth";
import { photosPubliques } from "@/lib/photos";
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
      ? supabase.from("ladies").select("id, display_name, age, display_country").in("id", ladyIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            display_name: string;
            age: number | null;
            display_country: string | null;
          }[],
        }),
    supabase
      .from("messages")
      .select("conversation_id, body, sender, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    photosPubliques(supabase, ladyIds),
  ]);

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));

  const dernierParConversation = new Map<string, { body: string; sender: string }>();
  for (const message of derniers ?? []) {
    if (!dernierParConversation.has(message.conversation_id)) {
      dernierParConversation.set(message.conversation_id, {
        body: message.body,
        sender: message.sender,
      });
    }
  }

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
          <ul className="bo-fil">
            {conversations.map((conversation) => {
              const femme = femmeParId.get(conversation.lady_id);
              const dernier = dernierParConversation.get(conversation.id);
              const nonLu = conversation.member_unread > 0;
              const photo = photos.get(conversation.lady_id)?.[0];

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/membre/conversations/${conversation.id}`}
                    className={nonLu ? "non-lu" : undefined}
                  >
                    <Avatar nom={femme?.display_name ?? "?"} url={photo?.url} />

                    <span className="corps">
                      <span className="ligne1">
                        <span className="qui">
                          {femme?.display_name ?? "—"}
                          {femme?.age ? `, ${femme.age}` : ""}
                        </span>
                        {femme?.display_country && (
                          <span className="vers">{femme.display_country}</span>
                        )}
                      </span>
                      <span className="apercu">
                        {dernier
                          ? `${dernier.sender === "member" ? "Vous : " : ""}${dernier.body}`
                          : "Conversation ouverte, à vous d'écrire"}
                      </span>
                    </span>

                    <span className="droite">
                      <span className="quand">{ilYA(conversation.last_message_at)}</span>
                      {nonLu && <span className="compte">{conversation.member_unread}</span>}
                    </span>
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
