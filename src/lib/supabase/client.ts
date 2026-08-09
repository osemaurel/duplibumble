import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Client Supabase pour le navigateur. La clé publiable est faite pour être
 * exposée : c'est le RLS, côté base, qui décide de ce que chaque visiteur peut
 * lire ou écrire — jamais le code client.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase non configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return createBrowserClient<Database>(url, key);
}
