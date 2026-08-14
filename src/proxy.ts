import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Convention `proxy` de Next 16, qui remplace `middleware`.
 * Rafraîchit la session Supabase et renvoie vers la connexion si un espace
 * privé est demandé sans être authentifié.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les images. `api/photos` en fait
    // partie : y faire tourner la vérification de session ajoutait un appel
    // d'authentification par vignette, pour une route qui ne sert que du
    // contenu public.
    "/((?!_next/static|_next/image|api/photos|favicon.ico|fonts/|profiles/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2)$).*)",
  ],
};
