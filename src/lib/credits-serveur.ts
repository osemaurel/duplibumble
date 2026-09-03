import "server-only";

import { lireBareme, lirePaliers, REPLI, type Bareme } from "./credits";
import type { PalierCredits } from "./supabase/types";

/**
 * Barème et paliers pour les pages publiques, sans risque d'échec.
 *
 * Une page juridique doit s'afficher même si la base est injoignable : un
 * document légal en erreur 500 fait échouer une vérification de paiement aussi
 * sûrement qu'un document absent. On retombe alors sur le barème de repli.
 *
 * Séparé de `credits.ts` parce que celui-ci est importé par un composant
 * client : y placer un accès serveur tirait tout le client Supabase serveur
 * dans le bundle du navigateur, et la compilation échouait.
 */
export async function baremeAffichable(): Promise<Bareme> {
  try {
    const { createClient } = await import("./supabase/server");
    return await lireBareme(await createClient());
  } catch {
    return { ...REPLI } as Bareme;
  }
}

export async function paliersAffichables(): Promise<PalierCredits[]> {
  try {
    const { createClient } = await import("./supabase/server");
    return await lirePaliers(await createClient());
  } catch {
    return [];
  }
}
