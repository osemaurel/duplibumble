import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Client à clé de service. Il contourne entièrement le RLS : à n'utiliser que
 * là où la base ne peut pas trancher seule — webhook de paiement qui crédite un
 * compte, import de dossiers, tâches d'administration serveur.
 *
 * L'import de `server-only` fait échouer la compilation si ce fichier venait à
 * être tiré dans un composant client : la clé ne peut donc pas fuir par
 * inadvertance vers le navigateur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Clé de service absente : renseignez SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY).",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
