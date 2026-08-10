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

/** Exige un rôle précis, sinon redirige. À appeler au sommet de chaque espace. */
export async function requireRole(role: UserRole, chemin: string) {
  const session = await getSessionProfile();

  if (!session) {
    redirect(`/connexion?suivant=${encodeURIComponent(chemin)}`);
  }
  if (session.profile.role !== role) {
    redirect("/");
  }

  return session;
}

export const requireAdmin = (chemin = "/admin") => requireRole("admin", chemin);
