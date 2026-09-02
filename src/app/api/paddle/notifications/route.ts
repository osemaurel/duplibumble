import { EventName } from "@paddle/paddle-node-sdk";

import { clientPaddle } from "@/lib/paddle";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notifications de Paddle.
 *
 * C'est le seul chemin par lequel un compte est crédité. Le retour du
 * navigateur après paiement ne crédite rien : cette adresse se fabrique, et la
 * rejouer suffirait à s'offrir des crédits. Ici la signature est vérifiée avant
 * qu'une seule valeur de la charge utile ne soit lue.
 *
 * Le nombre de crédits ne vient pas non plus de la notification : la base le
 * déduit du palier rattaché au prix Paddle. La notification dit ce qui a été
 * payé, la base dit ce que cela vaut.
 */

/** Le corps doit être lu brut : la signature porte sur les octets reçus. */
export const dynamic = "force-dynamic";

function reponse(texte: string, statut: number) {
  return new Response(texte, { status: statut });
}

export async function POST(requete: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    // 500 plutôt que 200 : Paddle réessaiera une fois la configuration en place.
    return reponse("Paiement non configuré", 500);
  }

  const signature = requete.headers.get("paddle-signature");
  if (!signature) return reponse("Signature absente", 400);

  const corps = await requete.text();

  let evenement;
  try {
    evenement = await clientPaddle().webhooks.unmarshal(corps, secret, signature);
  } catch {
    return reponse("Signature invalide", 401);
  }

  if (!evenement) return reponse("Événement illisible", 400);

  // Tout le reste est acquitté sans être traité : un 200 dit à Paddle que la
  // notification est arrivée, et lui évite de la réémettre indéfiniment.
  if (evenement.eventType !== EventName.TransactionCompleted) {
    return reponse("Ignoré", 200);
  }

  const transaction = evenement.data;
  const membreId = transaction.customData
    ? (transaction.customData as Record<string, unknown>).member_id
    : null;
  const priceId = transaction.items[0]?.price?.id ?? null;

  if (typeof membreId !== "string" || !priceId) {
    // Une transaction sans membre ni prix identifiable ne sera jamais traitable :
    // la réémettre n'y changerait rien, on l'acquitte et on la signale.
    console.error("Notification Paddle inexploitable", {
      transaction: transaction.id,
      membreId,
      priceId,
    });
    return reponse("Charge utile incomplète", 200);
  }

  // Paddle exprime les montants en plus petite unité monétaire, sous forme de
  // chaîne. `grandTotal` est ce que le client a réellement payé, taxes comprises.
  const total = Number.parseInt(transaction.details?.totals?.grandTotal ?? "0", 10);

  const admin = createAdminClient();
  const { data: credits, error } = await admin.rpc("enregistrer_achat_credits", {
    p_membre: membreId,
    p_fournisseur: "paddle",
    p_reference: transaction.id,
    p_price_id: priceId,
    p_montant_cents: Number.isFinite(total) ? total : 0,
    p_devise: transaction.currencyCode,
  });

  if (error) {
    // Un palier ou un membre introuvable ne se résoudra pas tout seul : on
    // acquitte pour ne pas boucler, et on laisse une trace exploitable.
    if (error.message.includes("PALIER_INTROUVABLE") || error.message.includes("MEMBRE_INTROUVABLE")) {
      console.error("Achat Paddle non rattachable", {
        transaction: transaction.id,
        membreId,
        priceId,
        erreur: error.message,
      });
      return reponse("Achat non rattachable", 200);
    }

    // Panne passagère : on renvoie une erreur pour que Paddle réessaie.
    console.error("Crédit d'un achat Paddle en échec", {
      transaction: transaction.id,
      erreur: error.message,
    });
    return reponse("Échec temporaire", 500);
  }

  // Zéro crédit accordé signifie que la transaction avait déjà été traitée.
  return reponse(credits ? `${credits} crédits accordés` : "Déjà traité", 200);
}
