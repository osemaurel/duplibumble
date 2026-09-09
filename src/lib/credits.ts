import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, GiftCatalogItem, PalierCredits } from "./supabase/types";

/**
 * Barème et paliers de recharge.
 *
 * Les valeurs vivent en base, pas ici. La raison est de sécurité autant que de
 * confort : la fonction `envoyer_message_membre` lit le prix dans la même table
 * pour facturer. Si le barème était une constante du code, il faudrait le lui
 * transmettre à l'appel — et rien n'empêcherait un client d'annoncer zéro.
 *
 * Les valeurs ci-dessous ne servent qu'au repli, si la table est injoignable.
 * Elles ne facturent rien : elles évitent seulement un écran vide.
 */
export const REPLI = {
  message: 1,
  photo: 2,
  video_minute: 4,
  bonus_bienvenue: 10,
  jours_remboursement: 7,
  /** Coût du déblocage d'une photo privée. */
  photo_privee: 15,
  /** Nombre de photos visibles sans crédits, en tête de chaque fiche. */
  photos_publiques: 2,
} as const;

export type CodeTarif = keyof typeof REPLI;
export type Bareme = Record<CodeTarif, number>;

export async function lireBareme(supabase: SupabaseClient<Database>): Promise<Bareme> {
  const { data } = await supabase.from("tarifs").select("code, montant");

  const bareme = { ...REPLI } as Bareme;
  for (const ligne of data ?? []) {
    if (ligne.code in bareme) bareme[ligne.code as CodeTarif] = ligne.montant;
  }
  return bareme;
}

export async function lirePaliers(
  supabase: SupabaseClient<Database>,
): Promise<PalierCredits[]> {
  const { data } = await supabase
    .from("paliers_credits")
    .select("*")
    .eq("actif", true)
    .order("ordre");

  return data ?? [];
}

/**
 * Catalogue des cadeaux virtuels, groupés par catégorie dans l'ordre
 * d'affichage. Purement symbolique : aucune expédition, aucune contrepartie
 * réelle — un geste payant dans le fil de discussion, rien de plus.
 */
export async function lireCadeaux(
  supabase: SupabaseClient<Database>,
): Promise<{ categories: { nom: string; cadeaux: GiftCatalogItem[] }[]; parCode: Map<string, GiftCatalogItem> }> {
  const { data } = await supabase
    .from("gift_catalog")
    .select("*")
    .eq("actif", true)
    .order("ordre");

  const cadeaux = data ?? [];
  const parCode = new Map(cadeaux.map((c) => [c.code, c]));

  const categories: { nom: string; cadeaux: GiftCatalogItem[] }[] = [];
  for (const cadeau of cadeaux) {
    let categorie = categories.find((c) => c.nom === cadeau.category);
    if (!categorie) {
      categorie = { nom: cadeau.category, cadeaux: [] };
      categories.push(categorie);
    }
    categorie.cadeaux.push(cadeau);
  }

  return { categories, parCode };
}

/** Prix d'un palier, formaté pour l'affichage. */
export function prixLisible(centimes: number, devise = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise }).format(
    centimes / 100,
  );
}

/** Prix unitaire du crédit dans un palier, à trois décimales près. */
export function prixDuCredit(palier: PalierCredits) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: palier.devise,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(palier.prix_cents / palier.credits / 100);
}

/** Remise par rapport au palier le plus cher au crédit, en pourcentage entier. */
export function remise(palier: PalierCredits, paliers: PalierCredits[]) {
  const reference = Math.max(...paliers.map((p) => p.prix_cents / p.credits));
  const unitaire = palier.prix_cents / palier.credits;
  return Math.round((1 - unitaire / reference) * 100);
}

