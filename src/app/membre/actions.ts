"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";
import { COUT_MESSAGE } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Envoie un message et débite le compte.
 *
 * Le débit passe par la clé de service : le journal des crédits n'est ouvert
 * en écriture à personne, sans quoi un membre pourrait s'en créditer. Le solde
 * est vérifié avant l'envoi, et le débit référence le message qui l'a
 * provoqué — chaque ligne du relevé reste ainsi justifiable.
 */
export async function envoyerMessage(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  const session = await requireMember();

  const conversationId = String(formData.get("conversation_id") ?? "");
  const corps = String(formData.get("corps") ?? "").trim();

  if (!conversationId) return { ok: false, message: "Conversation introuvable." };
  if (!corps) return { ok: false, message: "Le message est vide." };

  const supabase = await createClient();

  const { data: solde } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("member_id", session.userId)
    .maybeSingle();

  if ((solde?.balance ?? 0) < COUT_MESSAGE) {
    return {
      ok: false,
      message: `Crédits insuffisants : il en faut ${COUT_MESSAGE} pour envoyer un message.`,
    };
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender: "member",
      sender_profile_id: session.userId,
      body: corps,
    })
    .select("id")
    .single();

  if (error || !message) {
    return { ok: false, message: `Envoi refusé : ${error?.message ?? "erreur inconnue"}` };
  }

  const admin = createAdminClient();
  const { error: erreurDebit } = await admin.from("credit_transactions").insert({
    member_id: session.userId,
    amount: -COUT_MESSAGE,
    reason: "message",
    message_id: message.id,
  });

  if (erreurDebit) {
    // Le message est parti mais n'a pas été facturé. On le laisse : retirer un
    // message déjà visible par l'agent serait pire qu'un crédit non débité.
    // La ligne manquante se voit dans le relevé, elle est rattrapable.
    console.error("Débit non enregistré", { messageId: message.id, erreur: erreurDebit.message });
  }

  await supabase
    .from("conversations")
    .update({ member_unread: 0 })
    .eq("id", conversationId);

  revalidatePath(`/membre/conversations/${conversationId}`);
  revalidatePath("/membre");

  return { ok: true, message: "Message envoyé." };
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
