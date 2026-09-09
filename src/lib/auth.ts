import { redirect } from "next/navigation";
import { cache } from "react";

import { clesDeSignature } from "@/lib/supabase/jwks";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/supabase/types";

/**
 * Session courante enrichie du profil applicatif, ou null.
 *
 * Le rôle est relu dans la table plutôt que pris dans le jeton : une
 * rétrogradation prend ainsi effet dès la requête suivante, sans attendre
 * qu'une session expire.
 *
 * `cache` de React mémoïse le résultat pour la durée d'une seule requête. Ce
 * n'est pas une optimisation de confort : dans l'App Router, le layout et la
 * page d'un même espace sont deux composants distincts qui appellent tous deux
 * `requireAgent`. Sans mémoïsation, chaque affichage refaisait deux fois la
 * chaîne complète — un appel réseau au serveur d'authentification, puis une
 * lecture de `profiles`, puis une lecture de `agents` — alors que la réponse
 * est identique. La base et le serveur d'auth étant à Paris et l'application
 * servie depuis Washington, chacun de ces allers-retours coûtait près de
 * quatre-vingts millisecondes.
 *
 * La mémoïsation ne franchit pas la frontière d'une requête : deux visiteurs,
 * ou deux navigations du même visiteur, ne partagent jamais rien.
 *
 * L'identité vient de `getClaims`, qui vérifie la signature du jeton sur place
 * avec la clé publique du projet, plutôt que de `getUser`, qui la faisait
 * vérifier par le serveur d'authentification à chaque affichage. La garantie
 * est la même — un jeton falsifié ne passe pas une vérification
 * cryptographique — mais elle ne coûte plus un aller-retour réseau.
 *
 * Ce que ce choix concède : un compte banni au niveau de l'authentification
 * garderait l'accès jusqu'à l'expiration de son jeton, une heure au plus, là
 * où `getUser` l'aurait recalé aussitôt. Le rôle et l'existence du compte,
 * eux, restent relus dans `profiles` à chaque requête — une rétrogradation ou
 * une suppression prend donc effet immédiatement, et c'est par là que
 * l'application retire un accès.
 */
export const getSessionProfile = cache(async function getSessionProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
} | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims(undefined, {
    jwks: await clesDeSignature(),
  });
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .single();

  if (!profile) return null;

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile,
  };
});

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
 * Fiche agence rattachée à un compte, mémoïsée le temps d'une requête.
 *
 * Mémoïser `requireAgent` lui-même n'aurait pas marché : son paramètre a une
 * valeur par défaut, et `requireAgent()` puis `requireAgent("/agent")` sont
 * deux clés différentes pour React — le layout et la page seraient retombés
 * sur deux lectures distinctes. La clé est donc l'identifiant du compte, que
 * les deux appels partagent forcément.
 */
const ficheAgent = cache(async (profileId: string) => {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data;
});

/**
 * Exige un agent, et renvoie sa fiche agence en plus de la session.
 *
 * Un compte au rôle `agent` sans fiche agence ne peut rien faire : toutes les
 * politiques passent par `agent_id`. On préfère donc le renvoyer à l'accueil
 * plutôt que de le laisser devant des écrans vides et incompréhensibles.
 *
 * La redirection reste hors de la fonction mémoïsée : `redirect` lève une
 * exception, et on ne met pas une exception en cache.
 */
export async function requireAgent(chemin = "/agent") {
  const session = await requireRole("agent", chemin);
  const agent = await ficheAgent(session.userId);

  if (!agent) redirect("/");

  return { ...session, agent };
}
