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
