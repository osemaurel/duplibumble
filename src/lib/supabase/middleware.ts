import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./types";

/**
 * Rafraîchit la session à chaque requête et protège les espaces privés.
 *
 * Le middleware ne vérifie que la présence d'une session : le rôle se contrôle
 * plus loin, contre la base. Un jeton peut affirmer n'importe quoi, seule la
 * table `profiles` fait foi.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  // Sans configuration, on laisse passer : la landing publique doit rester
  // consultable même si la base n'est pas encore branchée.
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const espacePrive = path.startsWith("/admin") || path.startsWith("/agent");

  if (!user && espacePrive) {
    const connexion = request.nextUrl.clone();
    connexion.pathname = "/connexion";
    connexion.search = `?suivant=${encodeURIComponent(path)}`;
    return NextResponse.redirect(connexion);
  }

  return response;
}
