import "server-only";

import type { JWK } from "@supabase/supabase-js";

/**
 * Clés publiques de signature du projet, gardées d'une requête à l'autre.
 *
 * Sans ce cache, vérifier le jeton localement n'aurait rien économisé. Le
 * client Supabase garde bien les clés — mais sur l'instance du client, et nous
 * en créons une par requête, puisqu'elle porte les cookies du visiteur. Chaque
 * requête serait donc repartie chercher `/.well-known/jwks.json` : un
 * aller-retour réseau de remplacé par un autre, pour rien.
 *
 * Ici l'état vit dans le module. Il survit tant que l'instance serveur reste
 * chaude, c'est-à-dire pour l'essentiel du trafic. Une clé publique est faite
 * pour être diffusée et mise en cache : la garder dix minutes n'expose rien.
 *
 * La rotation reste couverte sans rien faire de plus : si le jeton est signé
 * par une clé absente de ce que nous fournissons, le client ne s'arrête pas
 * là, il interroge le point de découverte lui-même. Un cache périmé coûte donc
 * un aller-retour, jamais un refus.
 */

const DUREE_MS = 10 * 60 * 1000;

let cache: { keys: JWK[]; expire: number } | null = null;
/** Les requêtes simultanées d'une instance froide partagent le même appel. */
let enCours: Promise<JWK[]> | null = null;

function pointDeDecouverte() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  return url ? `${url}/auth/v1/.well-known/jwks.json` : null;
}

async function telecharger(): Promise<JWK[]> {
  const source = pointDeDecouverte();
  if (!source) return [];

  try {
    const reponse = await fetch(source, {
      // Le cache de Next ne doit pas s'en mêler : la durée de vie est tenue
      // ici, et elle doit rester la même quel que soit le contexte d'appel.
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!reponse.ok) return [];

    const charge = (await reponse.json()) as { keys?: JWK[] };
    return Array.isArray(charge.keys) ? charge.keys : [];
  } catch {
    // Injoignable : on renvoie une liste vide plutôt que d'échouer. Le client
    // retombera sur sa propre récupération, et à défaut sur une vérification
    // auprès du serveur d'authentification. Plus lent, jamais faux.
    return [];
  }
}

export async function clesDeSignature(): Promise<{ keys: JWK[] }> {
  if (cache && cache.expire > Date.now()) return { keys: cache.keys };

  enCours ??= telecharger().finally(() => {
    enCours = null;
  });

  const keys = await enCours;
  // On ne met en cache que ce qui a abouti : une liste vide réessaiera à la
  // requête suivante au lieu d'être figée dix minutes.
  if (keys.length) cache = { keys, expire: Date.now() + DUREE_MS };

  return { keys };
}
