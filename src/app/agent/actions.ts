"use server";

import { revalidatePath } from "next/cache";

import { requireAgent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Lady, MaritalStatus } from "@/lib/supabase/types";

type Resultat = { ok: true; message: string } | { ok: false; message: string };

/**
 * Répond au nom d'une femme du portefeuille.
 *
 * Le message part signé deux fois : `sender = 'lady'` dit au nom de qui il est
 * envoyé, `authored_by_agent_id` dit qui l'a écrit. Le RLS refuse l'insertion
 * si la conversation ne relève pas du portefeuille de cet agent — le contrôle
 * ici n'est qu'un raccourci pour afficher un message clair.
 */
export async function repondre(_prev: Resultat | null, formData: FormData): Promise<Resultat> {
  const { agent } = await requireAgent();

  const conversationId = String(formData.get("conversation_id") ?? "");
  const corps = String(formData.get("corps") ?? "").trim();

  if (!conversationId) return { ok: false, message: "Conversation introuvable." };
  if (!corps) return { ok: false, message: "Le message est vide." };

  const supabase = await createClient();

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender: "lady",
    authored_by_agent_id: agent.id,
    body: corps,
  });

  if (error) {
    return { ok: false, message: `Envoi refusé : ${error.message}` };
  }

  // Répondre vaut lecture : le compteur de non-lus retombe.
  await supabase
    .from("conversations")
    .update({ agent_unread: 0 })
    .eq("id", conversationId);

  revalidatePath(`/agent/conversations/${conversationId}`);
  revalidatePath("/agent");

  return { ok: true, message: "Message envoyé." };
}

export async function marquerLu(formData: FormData) {
  await requireAgent();

  const conversationId = String(formData.get("conversation_id") ?? "");
  if (!conversationId) return;

  const supabase = await createClient();
  await supabase.from("conversations").update({ agent_unread: 0 }).eq("id", conversationId);

  revalidatePath("/agent");
  revalidatePath(`/agent/conversations/${conversationId}`);
}

/** Champs publics de la fiche. Le reste appartient au dossier interne. */
const CHAMPS_PUBLICS = [
  "display_name",
  "display_city",
  "display_country",
  "profession",
  "education",
  "children",
  "eyes",
  "hair",
  "religion",
  "smoking",
  "drinking",
  "seeking",
  "willing_to_relocate",
  "headline",
  "bio",
  "looking_for",
] as const;

export async function enregistrerFiche(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireAgent();

  const ladyId = String(formData.get("lady_id") ?? "");
  if (!ladyId) return { ok: false, message: "Fiche introuvable." };

  const texte = (nom: string) => String(formData.get(nom) ?? "").trim() || null;

  const nombre = (nom: string) => {
    const valeur = String(formData.get(nom) ?? "").trim();
    if (!valeur) return null;
    const n = Number(valeur);
    return Number.isFinite(n) ? n : null;
  };

  const situation = String(formData.get("marital_status") ?? "").trim();
  const situationsValides: MaritalStatus[] = ["celibataire", "divorcee", "veuve", "separee"];

  const miseAJour: Partial<Lady> = {
    ...Object.fromEntries(CHAMPS_PUBLICS.map((champ) => [champ, texte(champ)])),
    height_cm: nombre("height_cm"),
    weight_kg: nombre("weight_kg"),
    seeking_age_min: nombre("seeking_age_min"),
    seeking_age_max: nombre("seeking_age_max"),
    marital_status: situationsValides.includes(situation as MaritalStatus)
      ? (situation as MaritalStatus)
      : null,
    interests: String(formData.get("interests") ?? "")
      .split(";")
      .map((i) => i.trim())
      .filter(Boolean),
  };

  if (!miseAJour.display_name) {
    return { ok: false, message: "Le prénom affiché est obligatoire." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ladies").update(miseAJour).eq("id", ladyId);

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath(`/agent/femmes/${ladyId}`);
  revalidatePath("/agent/femmes");

  return { ok: true, message: "Fiche enregistrée." };
}

/**
 * Soumet la fiche à l'administration. Un agent ne peut pas aller plus loin :
 * le trigger `ladies_guard_admin_fields` réserve la publication à l'admin.
 */
export async function soumettreFiche(formData: FormData) {
  await requireAgent();

  const ladyId = String(formData.get("lady_id") ?? "");
  if (!ladyId) return;

  const supabase = await createClient();
  await supabase.from("ladies").update({ status: "pending_review" }).eq("id", ladyId);

  revalidatePath(`/agent/femmes/${ladyId}`);
  revalidatePath("/agent/femmes");
}

export async function supprimerPhoto(formData: FormData) {
  const { agent } = await requireAgent();
  void agent;

  const photoId = String(formData.get("photo_id") ?? "");
  const ladyId = String(formData.get("lady_id") ?? "");
  const chemin = String(formData.get("storage_path") ?? "");
  if (!photoId) return;

  const supabase = await createClient();

  await supabase.from("lady_photos").delete().eq("id", photoId);
  if (chemin) await supabase.storage.from("lady-photos").remove([chemin]);

  revalidatePath(`/agent/femmes/${ladyId}`);
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
