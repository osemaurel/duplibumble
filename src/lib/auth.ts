import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Session courante enrichie du profil applicatif, ou null.
 *
 * Le rôle est relu dans la table à chaque appel plutôt que pris dans le jeton :
 * une rétrogradation prend ainsi effet immédiatement, sans attendre qu'une
 * session expire.
 */
export async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

/** L'espace d'accueil correspondant à un rôle. */
export function espaceDuRole(role: UserRole) {
  if (role === "admin") return "/admin";
  if (role === "agent") return "/agent";
  if (role === "member") return "/membre";
  return "/";
}

/** Exige un rôle précis, sinon redirige. À appeler au sommet de chaque espace. */
export async function requireRole(role: UserRole, chemin: string) {
  const session = await getSessionProfile();

  if (!session) {
    redirect(`/connexion?suivant=${encodeURIComponent(chemin)}`);
  }
  if (session.profile.role !== role) {
    // Vers son propre espace, pas vers l'accueil : renvoyer un agent sur la
    // landing lui laisse croire que sa connexion a échoué.
    redirect(espaceDuRole(session.profile.role));
  }

  return session;
}

export const requireAdmin = (chemin = "/admin") => requireRole("admin", chemin);
export const requireMember = (chemin = "/membre") => requireRole("member", chemin);

/**
 * Exige un agent, et renvoie sa fiche agence en plus de la session.
 *
 * Un compte au rôle `agent` sans fiche agence ne peut rien faire : toutes les
 * politiques passent par `agent_id`. On préfère donc le renvoyer à l'accueil
 * plutôt que de le laisser devant des écrans vides et incompréhensibles.
 */
export async function requireAgent(chemin = "/agent") {
  const session = await requireRole("agent", chemin);
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("profile_id", session.userId)
    .maybeSingle();

  if (!agent) redirect("/");

  return { ...session, agent };
}
