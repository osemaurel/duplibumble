import "server-only";

import { createAdminClient } from "./supabase/admin";

/**
 * Adresses e-mail des membres, pour l'administration.
 *
 * Elles vivent dans le schéma d'authentification, pas dans `profiles` — et
 * c'est délibéré : une politique autorise un agent à lire le profil du membre
 * avec qui il converse. Y ranger l'adresse la lui donnerait du même coup.
 *
 * La clé de service est donc le seul chemin, et seule l'administration
 * l'emprunte.
 */
export async function emailsDesMembres(identifiants: string[]) {
  const parId = new Map<string, string>();
  if (!identifiants.length) return parId;

  const admin = createAdminClient();
  const voulus = new Set(identifiants);

  // `listUsers` pagine. On s'arrête dès que tous les identifiants demandés ont
  // été trouvés, plutôt que de parcourir toute la base d'utilisateurs.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users.length) break;

    for (const utilisateur of data.users) {
      if (voulus.has(utilisateur.id) && utilisateur.email) {
        parId.set(utilisateur.id, utilisateur.email);
      }
    }

    if (parId.size === voulus.size || data.users.length < 200) break;
  }

  return parId;
}
