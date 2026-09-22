import { proposerReponse } from "@/lib/assistant";
import { dechiffrer } from "@/lib/chiffrement";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Répond aux conversations laissées en attente, au nom des agents qui l'ont
 * demandé.
 *
 * Réveillée par la base — `declencher_ia`, cadencée par pg_cron — et seulement
 * quand il y a du travail : Postgres ne sait pas appeler OpenAI, mais il sait
 * parfaitement dire s'il y a lieu de le faire. Réveiller à vide coûterait des
 * invocations d'hébergement pour rien.
 *
 * L'adresse n'est pas publique au sens où elle ne fait rien d'utile à qui
 * l'appelle : elle exige un secret partagé, et sans lui ne répond rien. Sans ce
 * garde-fou, n'importe qui pourrait faire consommer aux agents leur crédit
 * OpenAI en la sollicitant en boucle.
 */

/** Par passage. Une conversation en attente de plus attendra trente secondes. */
const PAR_PASSAGE = 10;

function refuse() {
  return new Response("Refusé", { status: 401 });
}

export async function POST(requete: Request) {
  const attendu = process.env.IA_WORKER_SECRET;
  if (!attendu) {
    return Response.json(
      { erreur: "IA_WORKER_SECRET absent : le travailleur est désactivé." },
      { status: 503 },
    );
  }

  const presente = requete.headers.get("authorization");
  if (presente !== `Bearer ${attendu}`) return refuse();

  const admin = createAdminClient();

  const { data: candidates, error } = await admin.rpc("conversations_pour_ia", {
    p_limite: PAR_PASSAGE,
  });

  if (error) {
    return Response.json({ erreur: error.message }, { status: 500 });
  }

  let envoyes = 0;
  const echecs: string[] = [];

  for (const candidate of candidates ?? []) {
    const resultat = await repondreA(admin, candidate.conversation_id, candidate.agent_id);
    if (resultat === "envoye") envoyes += 1;
    else echecs.push(`${candidate.conversation_id}: ${resultat}`);
  }

  return Response.json({ examinees: candidates?.length ?? 0, envoyes, echecs });
}

async function repondreA(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  agentId: string,
): Promise<string> {
  // Avant l'appel, pas après : si OpenAI met une minute à répondre ou n'en
  // revient jamais, le passage suivant ne doit pas rappeler la même
  // conversation et faire partir deux messages.
  await admin.rpc("marquer_tentative_ia", { p_conversation_id: conversationId });

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
      .select("sender, body")
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

  const [{ data: femme }, { data: membre }] = await Promise.all([
    admin.from("ladies").select("*").eq("id", conversation.lady_id).maybeSingle(),
    admin.from("profiles").select("display_name").eq("id", conversation.member_id).maybeSingle(),
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
  });

  if (!propose.ok) return propose.message;

  // Dernière vérification avant d'écrire : l'agent a pu reprendre la main
  // pendant que le modèle rédigeait. Deux réponses coup sur coup, dont une que
  // personne n'a voulue, se remarquent immédiatement.
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
    // Le mandat de l'agent couvre ce message : c'est lui qui a mis la machine
    // en route, et qui en répond. La trace dit qu'elle a tenu la plume.
    authored_by_agent_id: agentId,
    body: propose.texte,
    redige_par_ia: true,
  });

  if (erreurEnvoi) return `envoi refusé : ${erreurEnvoi.message}`;

  return "envoye";
}
