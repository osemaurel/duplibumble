"use client";

import { useEffect } from "react";

/**
 * Conversation en plein écran sur téléphone, clavier compris.
 *
 * Marquer le document permet à la feuille de styles de masquer l'en-tête et la
 * barre d'onglets, qui n'ont rien à faire au-dessus d'un clavier.
 *
 * Le reste traite un comportement propre à iOS : à l'ouverture du clavier,
 * Safari fait défiler la fenêtre entière pour amener le champ au-dessus des
 * touches. Un panneau fixé au haut de l'écran est alors poussé hors de la zone
 * visible, et l'en-tête de la conversation — photo et prénom de
 * l'interlocutrice — disparaît pendant qu'on écrit.
 *
 * `dvh` ne corrige que la hauteur, pas ce décalage. On suit donc la fenêtre
 * visuelle : sa hauteur donne celle du panneau, son décalage est compensé pour
 * que le haut du panneau reste collé au haut de ce qu'on voit réellement.
 */
export default function ModePleinEcran() {
  useEffect(() => {
    const surTelephone = window.matchMedia("(max-width: 720px)");
    if (!surTelephone.matches) return;

    document.body.classList.add("plein-ecran");

    const cadre = document.querySelector<HTMLElement>(".bo-conv.plein");
    const fenetre = window.visualViewport;

    if (!cadre || !fenetre) {
      return () => document.body.classList.remove("plein-ecran");
    }

    const ajuster = () => {
      cadre.style.height = `${fenetre.height}px`;
      cadre.style.transform = `translateY(${fenetre.offsetTop}px)`;

      // Le clavier vient de manger la moitié de l'écran : on se recolle au
      // dernier message, sinon on écrit sans voir ce à quoi on répond.
      const flux = cadre.querySelector<HTMLElement>(".bo-conv-flux");
      if (flux) flux.scrollTop = flux.scrollHeight;
    };

    ajuster();
    fenetre.addEventListener("resize", ajuster);
    fenetre.addEventListener("scroll", ajuster);

    return () => {
      fenetre.removeEventListener("resize", ajuster);
      fenetre.removeEventListener("scroll", ajuster);
      cadre.style.height = "";
      cadre.style.transform = "";
      document.body.classList.remove("plein-ecran");
    };
  }, []);

  return null;
}
