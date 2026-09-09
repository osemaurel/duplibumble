import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clesDeSignature } from "./jwks";
import type { Database } from "./types";

/**
 * Rafraîchit la session à chaque requête et protège les espaces privés.
 *
 * Le middleware ne vérifie que la présence d'une session : le rôle se contrôle
 * plus loin, contre la base. Un jeton peut affirmer n'importe quoi, seule la
 * table `profiles` fait foi.
 *
 * `getClaims` plutôt que `getUser` : le second interroge le serveur
 * d'authentification à chaque requête, soit un aller-retour vers Paris depuis
 * une application servie depuis Washington, pour chaque page et chaque
 * navigation. Le premier vérifie la signature du jeton sur place, avec la clé
 * publique du projet — celui-ci signe en ES256, et la clé est mise en cache
 * après le premier appel. Un jeton falsifié est rejeté aussi sûrement qu'avant,
 * la vérification est cryptographique et non déclarative.
 *
 * Le rafraîchissement est préservé : appelé sans jeton, `getClaims` passe par
 * `getSession`, qui renouvelle un accès expiré et déclenche l'écriture des
 * cookies ci-dessous. Le réseau n'est donc sollicité qu'à l'expiration, environ
 * une fois par heure, au lieu d'une fois par requête.
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

  const { data } = await supabase.auth.getClaims(undefined, {
    jwks: await clesDeSignature(),
  });
  const session = data?.claims ?? null;

  const path = request.nextUrl.pathname;
  const espacePrive =
    path.startsWith("/admin") || path.startsWith("/agent") || path.startsWith("/membre");

  if (!session && espacePrive) {
    // Un visiteur qui voulait son espace membre a plus de chances de devoir
    // s'inscrire que de se connecter : on l'envoie là où il aboutira.
    const cible = request.nextUrl.clone();
    cible.pathname = path.startsWith("/membre") ? "/inscription" : "/connexion";
    cible.search = `?suivant=${encodeURIComponent(path)}`;
    return NextResponse.redirect(cible);
  }

  return response;
}
