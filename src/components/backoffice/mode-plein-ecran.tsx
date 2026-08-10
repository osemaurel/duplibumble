"use client";

import { useEffect } from "react";

/**
 * Bascule la page en plein écran sur téléphone.
 *
 * Marque le document le temps où une conversation est ouverte : la feuille de
 * styles peut alors masquer l'en-tête et la barre d'onglets, qui n'ont rien à
 * faire au-dessus d'un clavier. La classe est posée sur le document plutôt que
 * passée en propriété, parce que les éléments à masquer vivent dans la mise en
 * page, hors de portée de cette page.
 */
export default function ModePleinEcran() {
  useEffect(() => {
    document.body.classList.add("plein-ecran");
    return () => document.body.classList.remove("plein-ecran");
  }, []);

  return null;
}
