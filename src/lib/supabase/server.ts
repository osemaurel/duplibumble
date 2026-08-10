import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Client Supabase pour les composants serveur, actions et route handlers.
 * La session vit dans les cookies : le RLS s'applique donc avec l'identité
 * réelle du visiteur, exactement comme côté navigateur.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Côté serveur, on accepte aussi les noms sans préfixe : l'intégration
  // Vercel pose les deux jeux de variables, et selon sa version l'un ou
  // l'autre peut manquer.
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

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un composant serveur : les cookies y sont en lecture
          // seule. Le rafraîchissement de session est alors assuré par le
          // middleware, il n'y a rien à faire ici.
        }
      },
    },
  });
}
