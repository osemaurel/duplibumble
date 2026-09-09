"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Resultat = { ok: true; message: string } | { ok: false; message: string };

/**
 * Ouvre la conversation avec une femme, ou rejoint celle qui existe déjà.
 *
 * L'unicité est garantie par la base — une seule conversation par couple
 * membre/femme. On s'appuie dessus plutôt que de vérifier avant d'insérer :
 * deux clics rapides ne peuvent donc pas créer deux fils parallèles.
 */
export async function ouvrirConversation(formData: FormData) {
  const session = await requireMember();
  const ladyId = String(formData.get("lady_id") ?? "");
  if (!ladyId) return;

  const supabase = await createClient();

  const { data: existante } = await supabase
    .from("conversations")
    .select("id")
    .eq("member_id", session.userId)
    .eq("lady_id", ladyId)
    .maybeSingle();

  if (existante) redirect(`/membre/conversations/${existante.id}`);

  const { data: creee, error } = await supabase
    .from("conversations")
    .insert({ member_id: session.userId, lady_id: ladyId })
    .select("id")
    .single();

  if (error || !creee) {
    // Course entre deux envois : la conversation vient d'être créée ailleurs.
    const { data: rattrapage } = await supabase
      .from("conversations")
      .select("id")
      .eq("member_id", session.userId)
      .eq("lady_id", ladyId)
      .maybeSingle();

    if (rattrapage) redirect(`/membre/conversations/${rattrapage.id}`);
    redirect(`/profils/${ladyId}?erreur=ouverture`);
  }

  revalidatePath("/membre");
  redirect(`/membre/conversations/${creee.id}`);
}

/**
 * Envoie un message et débite le compte, en une seule opération.
 *
 * Tout se passe dans `envoyer_message_membre`, côté base. L'ancienne version
 * faisait deux appels — insérer le message, puis écrire le débit — et laissait
 * passer le message quand le débit échouait. Il échouait systématiquement : la
 * contrainte de solde positif rejetait la ligne proposée avant que le report
 * n'ait lieu. Quinze messages sont ainsi partis sans être facturés.
 *
 * Le coût n'est pas transmis : la fonction le lit dans la table des tarifs.
 * Le lui passer reviendrait à laisser l'appelant fixer son propre prix.
 */
export async function envoyerMessage(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireMember();

  const conversationId = String(formData.get("conversation_id") ?? "");
  const corps = String(formData.get("corps") ?? "").trim();
  const pieceJointe = String(formData.get("attachment_path") ?? "").trim() || null;

  if (!conversationId) return { ok: false, message: "Conversation introuvable." };
  if (!corps && !pieceJointe) return { ok: false, message: "Le message est vide." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("envoyer_message_membre", {
    p_conversation_id: conversationId,
    p_body: corps,
    p_attachment_path: pieceJointe,
  });

  if (error) {
    return { ok: false, message: messageDErreur(error.message) };
  }

  // Lire ce qu'on vient d'écrire : la conversation n'a plus rien de non lu.
  await supabase.from("conversations").update({ member_unread: 0 }).eq("id", conversationId);

  revalidatePath(`/membre/conversations/${conversationId}`);
  revalidatePath("/membre");
  revalidatePath("/membre/compte");

  return { ok: true, message: "Message envoyé." };
}

/** Traduit les signaux de la fonction en phrases lisibles par un membre. */
function messageDErreur(brut: string): string {
  if (brut.includes("CREDITS_INSUFFISANTS")) {
    return "Crédits insuffisants. Rechargez votre compte pour continuer à écrire.";
  }
  if (brut.includes("CONVERSATION_INTROUVABLE")) return "Conversation introuvable.";
  if (brut.includes("MESSAGE_VIDE")) return "Le message est vide.";
  if (brut.includes("AUTHENTIFICATION_REQUISE")) return "Votre session a expiré. Reconnectez-vous.";
  return `Envoi refusé : ${brut}`;
}

/**
 * Débloque une photo privée. Tout se joue dans `debloquer_photo`, côté base :
 * le débit et la preuve de déblocage réussissent ou échouent ensemble.
 */
export async function debloquerPhoto(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireMember();

  const photoId = String(formData.get("photo_id") ?? "");
  if (!photoId) return { ok: false, message: "Photo introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("debloquer_photo", { p_photo_id: photoId });

  if (error) return { ok: false, message: messageDeblocageErreur(error.message) };

  const { data: photo } = await supabase
    .from("lady_photos")
    .select("lady_id")
    .eq("id", photoId)
    .maybeSingle();

  if (photo) revalidatePath(`/profils/${photo.lady_id}`);

  return { ok: true, message: "Photo débloquée." };
}

function messageDeblocageErreur(brut: string): string {
  if (brut.includes("CREDITS_INSUFFISANTS")) {
    return "Crédits insuffisants pour débloquer cette photo.";
  }
  if (brut.includes("PHOTO_INTROUVABLE")) return "Photo introuvable.";
  if (brut.includes("PHOTO_DEJA_PUBLIQUE")) return "Cette photo n'est pas privée.";
  if (brut.includes("AUTHENTIFICATION_REQUISE")) return "Votre session a expiré. Reconnectez-vous.";
  // Course entre deux clics rapides sur le même bouton : la photo est bien
  // débloquée, c'est le second appel qui échoue en la retrouvant déjà payée.
  if (brut.includes("duplicate key")) return "Photo déjà débloquée.";
  return `Déblocage refusé : ${brut}`;
}

/**
 * Envoie un cadeau virtuel dans une conversation. Purement symbolique : aucune
 * expédition, aucune contrepartie réelle. Le prix est relu dans le catalogue
 * par `envoyer_cadeau_membre`, jamais transmis par l'appelant.
 */
export async function envoyerCadeau(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireMember();

  const conversationId = String(formData.get("conversation_id") ?? "");
  const giftCode = String(formData.get("gift_code") ?? "");
  if (!conversationId || !giftCode) return { ok: false, message: "Cadeau introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("envoyer_cadeau_membre", {
    p_conversation_id: conversationId,
    p_gift_code: giftCode,
  });

  if (error) return { ok: false, message: messageCadeauErreur(error.message) };

  await supabase.from("conversations").update({ member_unread: 0 }).eq("id", conversationId);

  revalidatePath(`/membre/conversations/${conversationId}`);
  revalidatePath("/membre");

  return { ok: true, message: "Cadeau envoyé." };
}

function messageCadeauErreur(brut: string): string {
  if (brut.includes("CREDITS_INSUFFISANTS")) {
    return "Crédits insuffisants pour envoyer ce cadeau.";
  }
  if (brut.includes("CONVERSATION_INTROUVABLE")) return "Conversation introuvable.";
  if (brut.includes("CADEAU_INTROUVABLE")) return "Ce cadeau n'est plus disponible.";
  if (brut.includes("AUTHENTIFICATION_REQUISE")) return "Votre session a expiré. Reconnectez-vous.";
  return `Envoi refusé : ${brut}`;
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
