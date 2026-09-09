import Link from "next/link";

import { Avatar, EtatVide, IconeMessages } from "@/components/backoffice/ui";
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

export default async function BoiteDeReception({
  searchParams,
}: {
  searchParams: Promise<{ femme?: string; non_lu?: string }>;
}) {
  await requireAgent();
  const supabase = await createClient();
  const { femme: filtreFemme, non_lu: filtreNonLu } = await searchParams;

  // Le RLS restreint déjà aux conversations du portefeuille : rien d'autre ne
  // peut remonter, même en cas d'oubli de filtre.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const ladyIds = [...new Set((conversations ?? []).map((c) => c.lady_id))];
  const memberIds = [...new Set((conversations ?? []).map((c) => c.member_id))];

  const [{ data: femmes }, { data: membres }, { data: derniers }] = await Promise.all([
    ladyIds.length
      ? supabase.from("ladies").select("id, code, display_name, age").in("id", ladyIds)
      : Promise.resolve({
          data: [] as { id: string; code: string; display_name: string; age: number | null }[],
        }),
    memberIds.length
      ? supabase.from("profiles").select("id, display_name, country").in("id", memberIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string | null; country: string | null }[],
        }),
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

  // Filtres de la boîte de réception : par femme, et non-lus seulement. En
  // GET plutôt qu'en JavaScript côté client — l'état tient dans l'adresse,
  // partageable et compatible avec le bouton retour du navigateur.
  const femmesDuPortefeuille = [...femmeParId.values()].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );

  const conversationsFiltrees = (conversations ?? []).filter((c) => {
    if (filtreFemme && c.lady_id !== filtreFemme) return false;
    if (filtreNonLu === "1" && c.agent_unread === 0) return false;
    return true;
  });

  return (
    <div>
      <div className="bo-entete">
        <div>
          <h1 className="bo-titre">Messages</h1>
          <p className="bo-sous-titre">
            Toutes les conversations de votre portefeuille, la plus récente en premier.
          </p>
        </div>
        {enAttente > 0 && (
          <span className="bo-pastille refus" style={{ padding: "0.5rem 0.95rem" }}>
            {enAttente} en attente de réponse
          </span>
        )}
      </div>

      {conversations?.length ? (
        <form
          method="get"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.7rem" }}
        >
          <select name="femme" defaultValue={filtreFemme ?? ""}>
            <option value="">Toutes les femmes</option>
            {femmesDuPortefeuille.map((femme) => (
              <option key={femme.id} value={femme.id}>
                {femme.display_name}
              </option>
            ))}
          </select>

          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
            <input type="checkbox" name="non_lu" value="1" defaultChecked={filtreNonLu === "1"} />
            Non lus seulement
          </label>

          <button type="submit" className="bo-btn fantome petit">
            Filtrer
          </button>
          {(filtreFemme || filtreNonLu) && (
            <Link href="/agent" className="bo-btn fantome petit">
              Réinitialiser
            </Link>
          )}
        </form>
      ) : null}

      <div className="bo-carte" style={{ marginTop: conversations?.length ? "1rem" : 0 }}>
        {!conversations?.length ? (
          <EtatVide
            icone={IconeMessages}
            titre="Aucune conversation pour le moment"
            texte="Les messages arriveront dès qu'un membre écrira à l'une des femmes que vous représentez."
            action={
              <Link href="/agent/femmes" className="bo-btn">
                Compléter mes fiches
              </Link>
            }
          />
        ) : !conversationsFiltrees.length ? (
          <EtatVide
            icone={IconeMessages}
            titre="Aucune conversation ne correspond"
            texte="Essayez un autre filtre, ou réinitialisez-le."
          />
        ) : (
          <ul className="bo-fil">
            {conversationsFiltrees.map((conversation) => {
              const femme = femmeParId.get(conversation.lady_id);
              const membre = membreParId.get(conversation.member_id);
              const dernier = dernierParConversation.get(conversation.id);
              const nonLu = conversation.agent_unread > 0;
              const nomMembre = membre?.display_name ?? "Membre";

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/agent/conversations/${conversation.id}`}
                    className={nonLu ? "non-lu" : undefined}
                  >
                    <Avatar nom={nomMembre} />

                    <span className="corps">
                      <span className="ligne1">
                        <span className="qui">{nomMembre}</span>
                        <span className="vers">écrit à</span>
                        <span className="elle">
                          {femme?.display_name ?? "—"}
                          {femme?.age ? `, ${femme.age}` : ""}
                        </span>
                      </span>
                      <span className="apercu">
                        {dernier
                          ? `${dernier.sender === "lady" ? "Vous : " : ""}${dernier.body}`
                          : "Pas encore de message"}
                      </span>
                    </span>

                    <span className="droite">
                      <span className="quand">{ilYA(conversation.last_message_at)}</span>
                      {nonLu && <span className="compte">{conversation.agent_unread}</span>}
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
