"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { LadyStatus, PhotoStatus } from "@/lib/supabase/types";

/**
 * Toutes les actions commencent par requireAdmin(). Ce n'est pas redondant avec
 * le RLS : plusieurs d'entre elles passent par la clé de service, qui l'ignore.
 * Sans ce contrôle, la seule barrière serait l'affichage — c'est-à-dire aucune.
 */

type Resultat = { ok: true; message: string } | { ok: false; message: string };

/** Mot de passe provisoire, montré une seule fois à l'administrateur. */
function motDePasseProvisoire() {
  return randomBytes(9).toString("base64url");
}

export async function creerAgent(_prev: Resultat | null, formData: FormData): Promise<Resultat> {
  await requireAdmin();

  const code = String(formData.get("code") ?? "").trim();
  const agencyName = String(formData.get("agency_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;

  if (!code || !agencyName || !email) {
    return { ok: false, message: "Code, nom de l'agence et e-mail sont obligatoires." };
  }

  const admin = createAdminClient();
  const motDePasse = motDePasseProvisoire();

  // 1. Le compte d'authentification. Confirmé d'office : c'est l'administration
  //    qui l'ouvre, il n'y a pas d'adresse à valider par un lien.
  const { data: creation, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
    user_metadata: { display_name: agencyName },
  });

  if (erreurAuth || !creation.user) {
    return {
      ok: false,
      message: `Création du compte impossible : ${erreurAuth?.message ?? "erreur inconnue"}`,
    };
  }

  const profileId = creation.user.id;

  // 2. Le rôle. Le trigger d'inscription a déjà créé le profil en 'member'.
  const { error: erreurRole } = await admin
    .from("profiles")
    .update({ role: "agent", display_name: agencyName })
    .eq("id", profileId);

  if (erreurRole) {
    await admin.auth.admin.deleteUser(profileId);
    return { ok: false, message: `Attribution du rôle impossible : ${erreurRole.message}` };
  }

  // 3. La fiche agent.
  const { error: erreurAgent } = await admin.from("agents").insert({
    profile_id: profileId,
    code,
    agency_name: agencyName,
    contact_name: contactName,
    email,
    phone,
    country,
    city,
  });

  if (erreurAgent) {
    // Sans ce nettoyage, un code déjà pris laisserait un compte orphelin
    // capable de se connecter sans être rattaché à aucune agence.
    await admin.auth.admin.deleteUser(profileId);
    return { ok: false, message: `Création de l'agent impossible : ${erreurAgent.message}` };
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      `Agent ${code} créé. Identifiants à transmettre : ${email} / ${motDePasse} — ` +
      `ce mot de passe ne sera plus affiché.`,
  };
}

export async function changerStatutAgent(formData: FormData) {
  await requireAdmin();

  const agentId = String(formData.get("agent_id") ?? "");
  const statut = String(formData.get("statut") ?? "");
  if (!agentId || !["active", "suspended"].includes(statut)) return;

  const supabase = await createClient();
  await supabase.from("agents").update({ status: statut }).eq("id", agentId);

  revalidatePath("/admin/agents");
  revalidatePath(`/admin/agents/${agentId}`);
}

export async function creerFemme(_prev: Resultat | null, formData: FormData): Promise<Resultat> {
  await requireAdmin();

  const code = String(formData.get("code") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const legalName = String(formData.get("legal_name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const agentId = String(formData.get("agent_id") ?? "").trim() || null;
  const displayCity = String(formData.get("display_city") ?? "").trim() || null;
  const displayCountry = String(formData.get("display_country") ?? "").trim() || null;

  if (!code || !displayName || !legalName || !birthDate) {
    return {
      ok: false,
      message: "Code, prénom affiché, nom légal et date de naissance sont obligatoires.",
    };
  }

  const supabase = await createClient();

  const { data: femme, error: erreurFemme } = await supabase
    .from("ladies")
    .insert({
      code,
      display_name: displayName,
      agent_id: agentId,
      display_city: displayCity,
      display_country: displayCountry,
      status: "draft",
    })
    .select("id")
    .single();

  if (erreurFemme || !femme) {
    return { ok: false, message: `Création impossible : ${erreurFemme?.message ?? "erreur"}` };
  }

  const { error: erreurPrive } = await supabase
    .from("lady_private")
    .insert({ lady_id: femme.id, legal_name: legalName, birth_date: birthDate });

  if (erreurPrive) {
    await supabase.from("ladies").delete().eq("id", femme.id);
    return { ok: false, message: `Dossier privé refusé : ${erreurPrive.message}` };
  }

  revalidatePath("/admin/femmes");
  revalidatePath("/admin");

  return { ok: true, message: `Fiche ${code} créée en brouillon.` };
}

export async function changerStatutFemme(formData: FormData) {
  await requireAdmin();

  const ladyId = String(formData.get("lady_id") ?? "");
  const statut = String(formData.get("statut") ?? "") as LadyStatus;
  const statutsValides: LadyStatus[] = [
    "draft",
    "pending_review",
    "published",
    "rejected",
    "suspended",
  ];
  if (!ladyId || !statutsValides.includes(statut)) return;

  const supabase = await createClient();
  await supabase
    .from("ladies")
    .update({
      status: statut,
      published_at: statut === "published" ? new Date().toISOString() : null,
    })
    .eq("id", ladyId);

  revalidatePath("/admin/femmes");
  revalidatePath(`/admin/femmes/${ladyId}`);
  revalidatePath("/admin");
}

export async function attribuerFemme(formData: FormData) {
  await requireAdmin();

  const ladyId = String(formData.get("lady_id") ?? "");
  const agentId = String(formData.get("agent_id") ?? "");
  if (!ladyId) return;

  const supabase = await createClient();
  await supabase
    .from("ladies")
    .update({ agent_id: agentId || null })
    .eq("id", ladyId);

  revalidatePath("/admin/femmes");
  revalidatePath(`/admin/femmes/${ladyId}`);
  revalidatePath("/admin/agents");
}

export async function changerStatutPhoto(formData: FormData) {
  await requireAdmin();

  const photoId = String(formData.get("photo_id") ?? "");
  const ladyId = String(formData.get("lady_id") ?? "");
  const statut = String(formData.get("statut") ?? "") as PhotoStatus;
  if (!photoId || !["pending", "approved", "rejected"].includes(statut)) return;

  const supabase = await createClient();
  await supabase.from("lady_photos").update({ status: statut }).eq("id", photoId);

  revalidatePath(`/admin/femmes/${ladyId}`);
  revalidatePath("/admin");
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

/** Champs publics d'une fiche, modifiables par l'administration. */
const CHAMPS_FICHE = [
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

/**
 * Enregistre une fiche depuis l'administration : partie publique et dossier
 * interne d'un seul coup.
 *
 * L'agent ne peut modifier que la partie publique. L'administration, elle, doit
 * pouvoir compléter le dossier de vérification — c'est elle qui reçoit les
 * pièces d'identité et les mandats.
 */
export async function enregistrerFicheAdmin(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireAdmin();

  const ladyId = String(formData.get("lady_id") ?? "");
  if (!ladyId) return { ok: false, message: "Fiche introuvable." };

  const texte = (nom: string) => String(formData.get(nom) ?? "").trim() || null;
  const nombre = (nom: string) => {
    const valeur = String(formData.get(nom) ?? "").trim();
    if (!valeur) return null;
    const n = Number(valeur);
    return Number.isFinite(n) ? n : null;
  };
  const coche = (nom: string) => formData.get(nom) === "on";

  const situation = String(formData.get("marital_status") ?? "").trim();
  const situationsValides = ["celibataire", "divorcee", "veuve", "separee"];

  const fiche: Record<string, unknown> = Object.fromEntries(
    CHAMPS_FICHE.map((champ) => [champ, texte(champ)]),
  );
  fiche.height_cm = nombre("height_cm");
  fiche.weight_kg = nombre("weight_kg");
  fiche.seeking_age_min = nombre("seeking_age_min");
  fiche.seeking_age_max = nombre("seeking_age_max");
  fiche.marital_status = situationsValides.includes(situation) ? situation : null;
  fiche.interests = String(formData.get("interests") ?? "")
    .split(";")
    .map((i) => i.trim())
    .filter(Boolean);

  if (!fiche.display_name) {
    return { ok: false, message: "Le prénom affiché est obligatoire." };
  }

  const supabase = await createClient();

  const { error: erreurFiche } = await supabase
    .from("ladies")
    .update(fiche as never)
    .eq("id", ladyId);

  if (erreurFiche) {
    return { ok: false, message: `Enregistrement refusé : ${erreurFiche.message}` };
  }

  const prive: Record<string, unknown> = {
    legal_name: texte("legal_name"),
    nationality: texte("nationality"),
    residence_city: texte("residence_city"),
    residence_country: texte("residence_country"),
    email: texte("email"),
    phone: texte("phone"),
    id_document_type: texte("id_document_type"),
    id_document_number: texte("id_document_number"),
    mandate_signed: coche("mandate_signed"),
    mandate_date: texte("mandate_date"),
    photo_consent: coche("photo_consent"),
    internal_notes: texte("internal_notes"),
  };

  const naissance = texte("birth_date");
  if (naissance) prive.birth_date = naissance;

  // Le nom légal est obligatoire en base : sans lui, inutile de tenter.
  if (prive.legal_name) {
    const { error: erreurPrive } = await supabase
      .from("lady_private")
      .update(prive as never)
      .eq("lady_id", ladyId);

    if (erreurPrive) {
      return {
        ok: false,
        message: `Fiche publique enregistrée, mais le dossier interne a été refusé : ${erreurPrive.message}`,
      };
    }
  }

  revalidatePath(`/admin/femmes/${ladyId}`);
  revalidatePath("/admin/femmes");

  return { ok: true, message: "Fiche enregistrée." };
}

/** Modifie les coordonnées d'un agent. Le code reste figé : il sert de référence. */
export async function enregistrerAgent(
  _prev: Resultat | null,
  formData: FormData,
): Promise<Resultat> {
  await requireAdmin();

  const agentId = String(formData.get("agent_id") ?? "");
  if (!agentId) return { ok: false, message: "Agent introuvable." };

  const texte = (nom: string) => String(formData.get(nom) ?? "").trim() || null;

  const agencyName = texte("agency_name");
  if (!agencyName) return { ok: false, message: "Le nom de l'agence est obligatoire." };

  const supabase = await createClient();

  const { error } = await supabase
    .from("agents")
    .update({
      agency_name: agencyName,
      contact_name: texte("contact_name"),
      phone: texte("phone"),
      country: texte("country"),
      city: texte("city"),
      contract_signed: formData.get("contract_signed") === "on",
      contract_date: texte("contract_date"),
      notes: texte("notes"),
    })
    .eq("id", agentId);

  if (error) return { ok: false, message: `Enregistrement refusé : ${error.message}` };

  revalidatePath(`/admin/agents/${agentId}`);
  revalidatePath("/admin/agents");

  return { ok: true, message: "Agent enregistré." };
}
