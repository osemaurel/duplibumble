import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Client de lecture publique, sans session ni cookies.
 *
 * Sa raison d'être est le cache, pas la commodité. Le client de `server.ts`
 * lit les cookies pour connaître le visiteur ; or lire un cookie rend une page
 * dynamique aux yeux de Next, qui la reconstruit alors à chaque visite. La
 * page d'accueil et les pages tarifaires n'affichent pourtant rien qui dépende
 * de qui les consulte : sans ce client, elles payaient un rendu serveur
 * complet — et un démarrage à froid pour le premier visiteur — pour un contenu
 * identique pour tout le monde.
 *
 * À n'employer que pour ce qui est déjà public : le RLS s'applique ici avec le
 * rôle anonyme, exactement comme pour un visiteur non connecté. Il ne laisse
 * donc sortir que les fiches publiées, leurs photos validées, le barème et les
 * paliers. Toute donnée qui dépend d'un compte passe par `server.ts`.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase non configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
