"use server";

import { revalidatePath } from "next/cache";

import { proposerReponse, verifierCle } from "@/lib/assistant";
import { requireAgent } from "@/lib/auth";
import { chiffrer, chiffrementDisponible, dechiffrer } from "@/lib/chiffrement";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const pieceJointe = String(formData.get("attachment_path") ?? "").trim() || null;

  // Posé par la barre de réponse quand le texte part tel que l'assistant l'a
  // proposé. Retouché par l'agent, il redevient le sien : la trace consigne ce
  // qui s'est réellement passé, pas l'outil qui a servi en chemin.
  const redigeParIA = formData.get("redige_par_ia") === "on";

  if (!conversationId) return { ok: false, message: "Conversation introuvable." };
  if (!corps && !pieceJointe) return { ok: false, message: "Le message est vide." };

  const supabase = await createClient();

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender: "lady",
    // L'agent reste l'auteur responsable, même quand la machine a tenu la
    // plume : c'est lui qui a relu et décidé d'envoyer.
    authored_by_agent_id: agent.id,
    body: corps,
    attachment_path: pieceJointe,
    redige_par_ia: redigeParIA,
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

/**
 * Fixe le prix de déblocage d'une photo privée.
 *
 * L'agent ne choisit plus quelles photos sont privées : les deux premières
 * d'une fiche sont visibles, les suivantes ne le sont pas, et c'est la base
 * qui l'applique — le déclencheur `lady_photos_confidentialite`. Ce qui lui
 * reste, et qui a du sens, c'est l'ordre des photos et le prix de celles qui
 * sont derrière.
 *
 * Seule `unlock_cost` est écrite ici, jamais `is_private` : le déclencheur ne
 * se réveille que sur un changement de fiche ou de position, une écriture de
 * prix ne le rappelle donc pas.
 */
export async function definirPrixPhoto(formData: FormData) {
  await requireAgent();

  const photoId = String(formData.get("photo_id") ?? "");
  const ladyId = String(formData.get("lady_id") ?? "");
  if (!photoId) return;

  const coutSaisi = Number(String(formData.get("unlock_cost") ?? "").trim());
  if (!Number.isFinite(coutSaisi) || coutSaisi < 1) return;

  // Le RLS n'ouvre cette table qu'aux photos du portefeuille de l'agent :
  // impossible de toucher au tarif d'un confrère.
  const supabase = await createClient();
  await supabase
    .from("lady_photos")
    .update({ unlock_cost: Math.round(coutSaisi) })
    .eq("id", photoId);

  revalidatePath(`/agent/femmes/${ladyId}`);
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

/**
 * Réponses types : messages pré-rédigés qu'un agent réutilise d'un membre à
 * l'autre. Strictement personnelles — le RLS ne laisse un agent voir ni
 * modifier que les siennes.
 */
export async function creerReponseType(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  const { agent } = await requireAgent();

  const libelle = String(formData.get("libelle") ?? "").trim();
  const corps = String(formData.get("corps") ?? "").trim();

  if (!libelle || !corps) {
    return { ok: false, message: "Le titre et le texte sont obligatoires." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("reponses_types")
    .insert({ agent_id: agent.id, libelle, corps });

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath("/agent/reponses");

  return { ok: true, message: "Réponse type enregistrée." };
}

export async function supprimerReponseType(formData: FormData) {
  await requireAgent();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("reponses_types").delete().eq("id", id);

  revalidatePath("/agent/reponses");
}

/* ------------------------------------------------------- assistant de rédaction
 *
 * La table `agent_ia` n'ouvre sa lecture à personne d'autre que
 * l'administration : on y accède avec la clé de service, en se limitant
 * explicitement à l'agent authentifié. C'est le prix à payer pour que la
 * colonne chiffrée ne puisse pas sortir par le client.
 */

/** Enregistre la clé de l'agent, après l'avoir essayée auprès d'OpenAI. */
export async function enregistrerCleIA(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  const { agent } = await requireAgent();

  const cle = String(formData.get("cle") ?? "").trim();
  if (!cle) return { ok: false, message: "Collez votre clé pour l'enregistrer." };

  if (!chiffrementDisponible()) {
    return {
      ok: false,
      message:
        "Le coffre n'est pas configuré sur ce serveur : la clé ne peut pas être mise à l'abri, " +
        "elle n'a donc pas été enregistrée. Signalez-le à l'administration.",
    };
  }

  // Essayée avant d'être rangée : enregistrer une clé morte, c'est découvrir la
  // panne le jour où un membre attend une réponse.
  const essai = await verifierCle(cle);
  if (!essai.ok) return { ok: false, message: essai.message };

  const admin = createAdminClient();
  const { error } = await admin.from("agent_ia").upsert({
    agent_id: agent.id,
    cle_chiffree: chiffrer(cle),
    empreinte: cle.slice(-4),
    verifiee_le: new Date().toISOString(),
    // Déposer sa clé, c'est adhérer. La première version demandait ensuite de
    // cocher une case dans un second formulaire : la clé était acceptée, un
    // message annonçait que tout allait bien, et rien ne se déclenchait jamais.
    // Personne ne devinait qu'il manquait un geste, et rien ne le disait.
    actif: true,
  });

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath("/agent/assistant");
  return {
    ok: true,
    message:
      "Clé vérifiée auprès d'OpenAI et enregistrée. L'assistant est actif : " +
      "il répondra dans vos conversations. Décochez la case ci-dessous pour l'arrêter.",
  };
}

/** Modèle, consignes et interrupteur. La clé ne passe pas par là. */
export async function reglerAssistant(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  const { agent } = await requireAgent();

  const modele = String(formData.get("modele") ?? "").trim() || "gpt-4o-mini";
  const consignes = String(formData.get("consignes") ?? "").trim() || null;
  const actif = formData.get("actif") === "on";

  const admin = createAdminClient();
  const { data: existant } = await admin
    .from("agent_ia")
    .select("cle_chiffree")
    .eq("agent_id", agent.id)
    .maybeSingle();

  if (actif && !existant?.cle_chiffree) {
    return { ok: false, message: "Enregistrez d'abord une clé : sans elle, rien à activer." };
  }

  const { error } = await admin
    .from("agent_ia")
    .upsert({ agent_id: agent.id, modele, consignes, actif });

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath("/agent/assistant");
  return { ok: true, message: actif ? "Assistant activé." : "Réglages enregistrés." };
}

export async function oublierCleIA() {
  const { agent } = await requireAgent();
  const admin = createAdminClient();

  await admin
    .from("agent_ia")
    .update({ cle_chiffree: null, empreinte: null, verifiee_le: null, actif: false })
    .eq("agent_id", agent.id);

  revalidatePath("/agent/assistant");
}

/**
 * Propose un brouillon de réponse pour une conversation.
 *
 * Un brouillon, et rien de plus : le texte revient dans la barre de saisie,
 * l'agent le lit, le corrige et décide de l'envoyer. Rien ne part au nom d'une
 * femme sans qu'un mandataire l'ait vu — c'est ce que son mandat promet.
 */
export async function proposerBrouillon(conversationId: string): Promise<ResultatAssistantAgent> {
  const { agent } = await requireAgent();
  if (!conversationId) return { ok: false, message: "Conversation introuvable." };

  const supabase = await createClient();

  // Le RLS borne déjà la conversation au portefeuille de l'agent : s'il ne la
  // voit pas, elle n'existe pas pour lui.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, lady_id, member_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return { ok: false, message: "Conversation introuvable." };

  const admin = createAdminClient();
  const { data: reglages } = await admin
    .from("agent_ia")
    .select("cle_chiffree, modele, consignes, actif")
    .eq("agent_id", agent.id)
    .maybeSingle();

  if (!reglages?.actif || !reglages.cle_chiffree) {
    return { ok: false, message: "Votre assistant n'est pas activé." };
  }

  const cle = dechiffrer(reglages.cle_chiffree);
  if (!cle) {
    return {
      ok: false,
      message: "Votre clé n'a pas pu être relue. Enregistrez-la de nouveau.",
    };
  }

  const [{ data: femme }, { data: fil }, { data: membre }] = await Promise.all([
    supabase.from("ladies").select("*").eq("id", conversation.lady_id).maybeSingle(),
    supabase
      .from("messages")
      .select("sender, body")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", conversation.member_id)
      .maybeSingle(),
  ]);

  if (!femme) return { ok: false, message: "Fiche introuvable." };

  return proposerReponse({
    cle,
    modele: reglages.modele,
    consignes: reglages.consignes,
    femme,
    fil: fil ?? [],
    prenomMembre: membre?.display_name ?? "ce membre",
  });
}

type ResultatAssistantAgent = { ok: true; texte: string } | { ok: false; message: string };

/**
 * Interrupteur et consignes de l'IA pour une conversation précise.
 *
 * Le RLS borne déjà l'écriture aux conversations du portefeuille : inutile de
 * revérifier ici ce que la base refuse déjà.
 */
export async function reglerIAConversation(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireAgent();

  const conversationId = String(formData.get("conversation_id") ?? "");
  if (!conversationId) return { ok: false, message: "Conversation introuvable." };

  const actif = formData.get("actif") === "on";
  const consignes = String(formData.get("consignes") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("conversation_ia")
    .upsert({ conversation_id: conversationId, actif, consignes });

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath(`/agent/conversations/${conversationId}`);

  return {
    ok: true,
    message: actif ? "L'IA répondra sur cette conversation." : "IA désactivée sur cette conversation.",
  };
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
