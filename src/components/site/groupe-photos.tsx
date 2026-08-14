"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Au-delà, on montre ce qui est prêt plutôt que de faire attendre davantage. */
const PLAFOND_MS = 2500;

/**
 * Signale quand toutes les photos d'une zone sont chargées.
 *
 * Sans cela, les images se posent une à une au fil des octets qui arrivent :
 * la page se remplit par à-coups, et sur une connexion lente on voit chaque
 * cadre se remplir du haut vers le bas. Ici on attend que le lot soit prêt,
 * puis la feuille de style les révèle d'un seul geste.
 *
 * L'attente est bornée. Une photo manquante ou un réseau qui traîne ne peut
 * pas retenir la section indéfiniment : passé le plafond, on affiche ce qu'on
 * a. Et si le script ne s'exécute jamais, une animation CSS de secours révèle
 * quand même les images : leur visibilité ne dépend pas de JavaScript.
 */
export function usePhotosPretes(zone: RefObject<HTMLElement | null>) {
  const [pretes, setPretes] = useState(false);

  useEffect(() => {
    const element = zone.current;
    if (!element) return;

    let vivant = true;
    let minuterie: number | undefined;

    const revele = () => {
      if (!vivant) return;
      vivant = false;
      setPretes(true);
    };

    const attendre = () => {
      const images = Array.from(element.querySelectorAll("img"));

      const chargements = images.map((image) =>
        image.complete && image.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>((resoudre) => {
              // Une image en erreur résout aussi : elle laisse voir son cadre,
              // elle ne retient pas ses voisines.
              image.addEventListener("load", () => resoudre(), { once: true });
              image.addEventListener("error", () => resoudre(), { once: true });
            }),
      );

      // `Promise.all` d'un tableau vide se résout au tour suivant : la mise à
      // jour d'état reste asynchrone même sans image.
      void Promise.all(chargements).then(revele);
      minuterie = window.setTimeout(revele, PLAFOND_MS);
    };

    // Les sections du bas ne chargent leurs images qu'à l'approche du regard.
    // Lancer le compte à rebours au montage les condamnerait au plafond : on
    // attend qu'elles s'approchent.
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (!entrees.some((entree) => entree.isIntersecting)) return;
        observateur.disconnect();
        attendre();
      },
      { rootMargin: "300px" },
    );
    observateur.observe(element);

    return () => {
      vivant = false;
      observateur.disconnect();
      if (minuterie) window.clearTimeout(minuterie);
    };
  }, [zone]);

  return pretes;
}

/**
 * Conteneur qui révèle ses photos ensemble.
 *
 * Il prend la classe du bloc qu'il remplace : c'est lui l'élément de mise en
 * page, pas une couche ajoutée par-dessus. Un `<div>` intermédiaire casserait
 * les grilles et les positionnements absolus des sections concernées.
 */
export default function GroupePhotos({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const pretes = usePhotosPretes(zone);

  return (
    <div ref={zone} className={className} data-photos={pretes ? "pretes" : "attente"}>
      {children}
    </div>
  );
}
