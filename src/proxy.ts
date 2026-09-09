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
    // Tout sauf les fichiers statiques, les images, et les pages qui ne
    // dépendent d'aucune session.
    //
    // `api/photos` : y faire tourner la vérification de session ajoutait un
    // appel d'authentification par vignette, pour une route qui ne sert que du
    // contenu public.
    //
    // Les pages légales et d'information sont désormais rendues à l'avance et
    // servies depuis le cache : elles n'affichent rien qui dépende de qui les
    // consulte, et les faire passer par ici ajouterait un traitement avant
    // chaque envoi d'un document par ailleurs figé.
    //
    // On ne va pas plus loin — restreindre le proxy aux seuls /admin, /agent
    // et /membre serait tentant, mais c'est lui qui écrit les cookies de
    // session renouvelés : un composant serveur ne le peut pas. Un membre qui
    // resterait plus d'une heure sur les pages publiques verrait son jeton
    // expirer sans jamais être renouvelé, et se retrouverait déconnecté.
    "/((?!_next/static|_next/image|api/photos|favicon.ico|fonts/|profiles/|conditions|confidentialite|remboursement|contact|securite|tarifs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2)$).*)",
  ],
};
