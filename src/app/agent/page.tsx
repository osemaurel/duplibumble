import Link from "next/link";

import ListeConversations, {
  type LigneConversation,
} from "@/components/backoffice/liste-conversations";
import { EtatVide, IconeMessages } from "@/components/backoffice/ui";
import { requireAgent } from "@/lib/auth";
import { apercuDe, ilYA } from "@/lib/temps";
import { createClient } from "@/lib/supabase/server";

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
      .select("conversation_id, body, sender, created_at, attachment_path")
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const femmeParId = new Map((femmes ?? []).map((f) => [f.id, f]));
  const membreParId = new Map((membres ?? []).map((m) => [m.id, m]));

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

  const lignes: LigneConversation[] = conversationsFiltrees.map((conversation) => {
    const femme = femmeParId.get(conversation.lady_id);
    const membre = membreParId.get(conversation.member_id);
    const dernier = dernierParConversation.get(conversation.id);
    const nomMembre = membre?.display_name ?? "Membre";
    const texte = dernier ? apercuDe(dernier) : "";

    return {
      id: conversation.id,
      href: `/agent/conversations/${conversation.id}`,
      avatarNom: nomMembre,
      qui: nomMembre,
      destinataire: `${femme?.display_name ?? "—"}${femme?.age ? `, ${femme.age}` : ""}`,
      // Côté agent, « Vous » couvre aussi ce que l'assistant a écrit en son
      // nom : c'est son mandat qui l'a fait partir, et sa responsabilité.
      dernier: dernier ? { texte, deMoi: dernier.sender === "lady" } : null,
      vide: "Pas encore de message",
      dateISO: conversation.last_message_at,
      quandInitial: ilYA(conversation.last_message_at),
      nonLu: conversation.agent_unread,
    };
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
          <ListeConversations lignes={lignes} monCote="lady" />
        )}
      </div>
    </div>
  );
}
