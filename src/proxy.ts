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
    // Tout sauf les fichiers statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|fonts/|profiles/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2)$).*)",
  ],
};
