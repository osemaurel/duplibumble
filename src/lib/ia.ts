import "server-only";

import { proposerReponse } from "./assistant";
import { dechiffrer } from "./chiffrement";
import { createAdminClient } from "./supabase/admin";

/**
 * Réponse automatique de l'assistant, pour une conversation.
 *
 * Deux chemins y mènent, et c'est voulu.
 *
 * Le premier part de l'envoi du membre : l'action serveur qui vient d'écrire
 * son message enchaîne ici, après avoir rendu la main au navigateur. C'est le
 * chemin normal, et le seul qui tienne dans les dix secondes.
 *
 * Le second est le réveil planifié par la base, toutes les trente secondes.
 * Il ne sert plus qu'à rattraper : un redémarrage au mauvais moment, un appel
 * parti sans jamais revenir, un message inséré par un autre chemin. Avant, il
 * était la voie normale — d'où les trente à cinquante secondes d'attente les
 * bons jours, puisqu'il fallait d'abord que la base veuille bien regarder.
 *
 * Les deux chemins passent par la même réservation : jamais deux réponses.
 */

/** Un signal de saisie toutes les deux secondes : les points tiennent quatre. */
const RYTHME_SAISIE_MS = 2000;

/**
 * Au-delà, on rend la main plutôt que de faire attendre.
 *
 * Plus court que la limite du brouillon manuel — là, un agent regarde son
 * écran et préfère attendre une réponse tardive à pas de réponse du tout. Ici
 * personne ne regarde, et le filet repassera.
 */
const DELAI_OPENAI_MS = 12000;

/** Combien de temps la réservation tient si l'appel ne revient jamais. */
const VERROU_S = 90;

type Admin = ReturnType<typeof createAdminClient>;

const pause = (ms: number) => new Promise((resoudre) => setTimeout(resoudre, ms));

/**
 * Répond tout de suite, si cette conversation est suivie par une IA.
 *
 * Écrite pour être appelée dans un `after()` : elle ne jette jamais, et ne
 * renvoie rien. Un membre n'a pas à voir son message refusé parce que l'IA
 * d'un agent a mal tourné.
 */
export async function repondreMaintenant(conversationId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: agentId } = await admin.rpc("agent_ia_de_la_conversation", {
      p_conversation_id: conversationId,
    });

    // Aucune IA sur ce fil : on s'arrête avant de réserver, pour ne pas semer
    // une ligne de réglage dans chaque conversation du site.
    if (!agentId) return;

    await repondreA(admin, conversationId, agentId);
  } catch {
    // Le filet planifié repassera. Faire remonter l'erreur ici ferait échouer
    // l'envoi du membre, qui n'y est pour rien.
  }
}

/**
 * Compose et envoie la réponse, points de saisie compris.
 *
 * Renvoie `"envoye"` ou la raison de l'abandon — les deux appelants s'en
 * servent pour leur journal, aucun pour décider quoi que ce soit.
 */
export async function repondreA(
  admin: Admin,
  conversationId: string,
  agentId: string,
): Promise<string> {
  // Réservation d'abord : si l'appel à OpenAI s'éternise ou n'en revient
  // jamais, le réveil suivant ne doit pas faire partir un second message.
  const { data: obtenue } = await admin.rpc("reclamer_conversation_ia", {
    p_conversation_id: conversationId,
    p_verrou_secondes: VERROU_S,
  });

  if (!obtenue) return "déjà pris en charge";

  const { data: conversation } = await admin
    .from("conversations")
    .select("lady_id, member_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return "conversation introuvable";

  const [{ data: reglages }, { data: fil }, { data: filReglages }] = await Promise.all([
    admin
      .from("agent_ia")
      .select("cle_chiffree, modele, consignes, actif")
      .eq("agent_id", agentId)
      .maybeSingle(),
    admin
      .from("messages")
      .select("sender, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40),
    admin
      .from("conversation_ia")
      .select("consignes")
      .eq("conversation_id", conversationId)
      .maybeSingle(),
  ]);

  if (!reglages?.actif || !reglages.cle_chiffree) return "assistant inactif";

  const cle = dechiffrer(reglages.cle_chiffree);
  if (!cle) return "clé illisible";

  const dernierMessage = fil?.[fil.length - 1];
  if (dernierMessage?.sender !== "member") return "rien à répondre";

  // Les points partent avant l'appel au modèle, et se répètent jusqu'à
  // l'envoi : c'est pendant l'attente qu'ils servent, pas après.
  const saisie = ouvrirSaisie(admin, conversationId);

  try {
    const [{ data: femme }, { data: membre }, delaiMinimumMs] = await Promise.all([
      admin.from("ladies").select("*").eq("id", conversation.lady_id).maybeSingle(),
      admin.from("profiles").select("display_name").eq("id", conversation.member_id).maybeSingle(),
      delaiMinimum(admin),
    ]);

    if (!femme) return "fiche introuvable";

    const propose = await proposerReponse({
      cle,
      modele: reglages.modele,
      consignes: reglages.consignes,
      consignesFil: filReglages?.consignes ?? null,
      femme,
      fil: fil ?? [],
      prenomMembre: membre?.display_name ?? "ce membre",
      delaiMs: DELAI_OPENAI_MS,
    });

    if (!propose.ok) return propose.message;

    // Une réponse arrivée en une seconde et demie se voit : personne ne lit,
    // ne réfléchit et n'écrit aussi vite. Le compte part du message du membre
    // et non d'ici, si bien qu'un rattrapage tardif n'attend pas pour rien.
    const ecoule = Date.now() - new Date(dernierMessage.created_at).getTime();
    if (ecoule < delaiMinimumMs) await pause(delaiMinimumMs - ecoule);

    // Dernière vérification avant d'écrire : l'agent a pu reprendre la main
    // pendant que le modèle rédigeait. Deux réponses coup sur coup, dont une
    // que personne n'a voulue, se remarquent immédiatement.
    const { data: dernier } = await admin
      .from("messages")
      .select("sender")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dernier?.sender !== "member") return "l'agent a repris la main";

    const { error: erreurEnvoi } = await admin.from("messages").insert({
      conversation_id: conversationId,
      sender: "lady",
      // Le mandat de l'agent couvre ce message : c'est lui qui a mis la
      // machine en route, et qui en répond. La trace dit qui a tenu la plume.
      authored_by_agent_id: agentId,
      body: propose.texte,
      redige_par_ia: true,
    });

    if (erreurEnvoi) return `envoi refusé : ${erreurEnvoi.message}`;

    // La réponse est partie : la réservation n'a plus de raison d'être. Sans
    // cette levée, le message suivant du membre attendrait la fin du verrou —
    // c'était précisément le défaut qui faisait traîner les conversations
    // vivantes jusqu'à cinq minutes.
    await admin.rpc("liberer_conversation_ia", { p_conversation_id: conversationId });

    return "envoye";
  } finally {
    saisie.arreter();
  }
}

/** Points de saisie, jusqu'à ce qu'on les arrête. */
function ouvrirSaisie(admin: Admin, conversationId: string) {
  const battre = () => {
    // `.then()` n'est pas décoratif : le constructeur de requête de Supabase
    // est paresseux, il n'envoie rien tant que personne ne l'attend. Écrit
    // `void admin.rpc(...)`, l'appel ne partait pas — mesuré, aucun signal de
    // saisie n'arrivait jamais, et rien ne le disait puisqu'il n'y avait pas
    // d'erreur à voir. Les deux branches sont vides à dessein : un signal de
    // saisie perdu ne doit pas faire échouer la réponse.
    admin
      .rpc("diffuser_saisie", { p_conversation_id: conversationId, p_cote: "lady" })
      .then(
        () => {},
        () => {},
      );
  };

  battre();
  const rythme = setInterval(battre, RYTHME_SAISIE_MS);

  return { arreter: () => clearInterval(rythme) };
}

/** Durée minimale visible des points, réglable par l'administrateur. */
async function delaiMinimum(admin: Admin): Promise<number> {
  const { data } = await admin
    .from("tarifs")
    .select("montant")
    .eq("code", "ia_delai_secondes")
    .maybeSingle();

  return (data?.montant ?? 4) * 1000;
}
