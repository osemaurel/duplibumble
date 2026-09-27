"use client";

import { useSyncExternalStore } from "react";

import { SIGNAL_CONSENTEMENT, type Consentement, lireConsentement } from "@/lib/pixel";

/**
 * Le choix publicitaire du visiteur, tel que React doit le voir.
 *
 * Le choix vit dans le stockage local du navigateur, c'est-à-dire hors de
 * React : le lire dans un effet pour le recopier dans un état marcherait, mais
 * demanderait un rendu de plus et laisserait deux sources de vérité à tenir
 * d'accord. `useSyncExternalStore` est fait exactement pour cela.
 *
 * Il rend `undefined` pendant le rendu serveur et l'hydratation — le serveur
 * ne peut pas connaître ce choix — puis la vraie valeur juste après. D'où les
 * trois cas à l'usage : `undefined` on ne sait pas encore, `null` la question
 * n'a pas été posée, sinon la réponse.
 */
export function useConsentement(): Consentement | null | undefined {
  return useSyncExternalStore(abonner, lireConsentement, () => undefined);
}

function abonner(prevenir: () => void) {
  // `storage` couvre les autres onglets, le signal interne couvre celui-ci :
  // le navigateur ne se prévient pas lui-même de ses propres écritures.
  window.addEventListener(SIGNAL_CONSENTEMENT, prevenir);
  window.addEventListener("storage", prevenir);

  return () => {
    window.removeEventListener(SIGNAL_CONSENTEMENT, prevenir);
    window.removeEventListener("storage", prevenir);
  };
}
