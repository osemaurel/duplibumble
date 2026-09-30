import { repondreA } from "@/lib/ia";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Filet de rattrapage des réponses automatiques.
 *
 * Ce n'est plus la voie normale. Depuis que l'envoi du membre déclenche la
 * réponse directement, cette adresse ne sert qu'aux cas où ce déclenchement
 * n'a pas abouti : un redémarrage au mauvais moment, un appel parti sans
 * jamais revenir, un message inséré par un autre chemin. Elle ne trouve donc
 * le plus souvent rien à faire, et c'est le signe que tout va bien.
 *
 * Réveillée par la base — `declencher_ia`, cadencée par pg_cron — et seulement
 * quand il y a du travail : Postgres ne sait pas appeler OpenAI, mais il sait
 * parfaitement dire s'il y a lieu de le faire.
 *
 * L'adresse exige un secret partagé. Sans lui, n'importe qui pourrait faire
 * consommer aux agents leur crédit OpenAI en la sollicitant en boucle.
 */

/** Chaque conversation tient une douzaine de secondes au pire. */
export const maxDuration = 60;

/** Par passage. Une conversation de plus attendra le réveil suivant. */
const PAR_PASSAGE = 10;

export async function POST(requete: Request) {
  const attendu = process.env.IA_WORKER_SECRET;
  if (!attendu) {
    return Response.json(
      { erreur: "IA_WORKER_SECRET absent : le travailleur est désactivé." },
      { status: 503 },
    );
  }

  if (requete.headers.get("authorization") !== `Bearer ${attendu}`) {
    return new Response("Refusé", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: candidates, error } = await admin.rpc("conversations_pour_ia", {
    p_limite: PAR_PASSAGE,
  });

  if (error) return Response.json({ erreur: error.message }, { status: 500 });

  // De front, et non l'une après l'autre : dix conversations en attente, ce
  // sont dix appels à des modèles différents, chez des agents différents. Les
  // enchaîner faisait payer à la dernière l'attente de toutes les autres —
  // jusqu'à dépasser la durée accordée à la fonction, et n'en servir aucune.
  const resultats = await Promise.all(
    (candidates ?? []).map(async (candidate) => ({
      conversation: candidate.conversation_id,
      issue: await repondreA(admin, candidate.conversation_id, candidate.agent_id),
    })),
  );

  return Response.json({
    examinees: resultats.length,
    envoyes: resultats.filter((r) => r.issue === "envoye").length,
    echecs: resultats.filter((r) => r.issue !== "envoye"),
  });
}
