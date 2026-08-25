"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Photo from "./photo";

export type PhotoProfil = { url: string; caption: string | null };

/** Déplacement horizontal minimal, en pixels, pour compter comme un balayage. */
const SEUIL_BALAYAGE = 45;

/**
 * Photos d'une fiche : une grande, des vignettes, et une visionneuse.
 *
 * Les vignettes faisaient à peine cent pixels de côté : on devinait la photo
 * sans la voir. Elles ouvrent maintenant un affichage plein écran, où la photo
 * est montrée entière plutôt que recadrée — recadrer en plein écran couperait
 * précisément ce qu'on est venu regarder.
 *
 * La navigation suit les habitudes de chaque appareil : balayage du doigt sur
 * téléphone, flèches du clavier et clic sur ordinateur, Échap pour fermer
 * partout.
 */
export default function GalerieProfil({
  photos,
  nom,
}: {
  photos: PhotoProfil[];
  nom: string;
}) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const fermeture = useRef<HTMLButtonElement>(null);

  const total = photos.length;
  const fermer = useCallback(() => setOuverte(null), []);

  const glisser = useCallback(
    (pas: number) => setOuverte((i) => (i === null ? null : (i + pas + total) % total)),
    [total],
  );

  // La dépendance est l'ouverture, pas la photo courante : sinon l'effet se
  // rejouerait à chaque balayage et ramènerait le focus sur la croix entre
  // deux photos.
  const estOuverte = ouverte !== null;

  // Clavier et défilement du fond. Sans le verrou, la page continue de glisser
  // derrière la visionneuse : on la retrouve ailleurs en refermant.
  useEffect(() => {
    if (!estOuverte) return;

    const touche = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") fermer();
      else if (evenement.key === "ArrowRight") glisser(1);
      else if (evenement.key === "ArrowLeft") glisser(-1);
    };

    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", touche);

    // Le clavier arrive sur le bouton de fermeture : la sortie est à portée
    // immédiate pour qui navigue sans souris.
    fermeture.current?.focus();

    return () => {
      document.body.style.overflow = debordement;
      window.removeEventListener("keydown", touche);
    };
  }, [estOuverte, fermer, glisser]);

  if (!total) {
    return (
      <div className="mb-photo-principale">
        <span className="sans-photo">Photo à venir</span>
      </div>
    );
  }

  // Repris dans une constante : c'est elle que TypeScript sait affiner en
  // nombre à l'intérieur du bloc, pas la variable d'état.
  const index = ouverte;
  const courante = index === null ? null : photos[index];

  return (
    <>
      <button
        type="button"
        className="mb-photo-principale mb-photo-ouvrir"
        onClick={() => setOuverte(0)}
        aria-label={`Voir les photos de ${nom} en grand`}
      >
        <Photo
          src={photos[0].url}
          alt={`${nom}`}
          sizes="(max-width:900px) 92vw, 460px"
          prioritaire
        />
        <span className="mb-loupe" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4M11 8v6M8 11h6" />
          </svg>
          {total > 1 ? `${total} photos` : "Agrandir"}
        </span>
      </button>

      {total > 1 && (
        <div className="mb-vignettes">
          {photos.slice(1).map((photo, rang) => (
            <button
              type="button"
              className="vignette"
              key={photo.url}
              onClick={() => setOuverte(rang + 1)}
              aria-label={`Voir la photo ${rang + 2} de ${nom} en grand`}
            >
              <Photo src={photo.url} alt="" sizes="120px" />
            </button>
          ))}
        </div>
      )}

      {index !== null && courante && (
        <div
          className="mb-visionneuse"
          role="dialog"
          aria-modal="true"
          aria-label={`Photos de ${nom}`}
          onClick={fermer}
          onTouchStart={(e) => {
            const t = e.touches[0];
            depart.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const debut = depart.current;
            depart.current = null;
            if (!debut) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - debut.x;
            // Un geste plus vertical qu'horizontal n'est pas un balayage : c'est
            // une tentative de faire défiler, qu'on n'interprète pas de travers.
            if (Math.abs(dx) < SEUIL_BALAYAGE || Math.abs(dx) < Math.abs(t.clientY - debut.y)) return;
            glisser(dx < 0 ? 1 : -1);
          }}
        >
          <button
            ref={fermeture}
            type="button"
            className="mb-vis-fermer"
            onClick={fermer}
            aria-label="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          {/* Le clic sur le fond ferme ; celui sur la photo ne doit pas. */}
          <figure className="mb-vis-scene" onClick={(e) => e.stopPropagation()}>
            <div className="mb-vis-cadre">
              <Photo
                src={courante.url}
                alt={`${nom} — photo ${index + 1} sur ${total}`}
                sizes="100vw"
                ajustement="contain"
                prioritaire
              />
            </div>
            {courante.caption && <figcaption>{courante.caption}</figcaption>}
          </figure>

          {total > 1 && (
            <>
              <button
                type="button"
                className="mb-vis-fleche gauche"
                onClick={(e) => {
                  e.stopPropagation();
                  glisser(-1);
                }}
                aria-label="Photo précédente"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                type="button"
                className="mb-vis-fleche droite"
                onClick={(e) => {
                  e.stopPropagation();
                  glisser(1);
                }}
                aria-label="Photo suivante"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <p className="mb-vis-compte" onClick={(e) => e.stopPropagation()}>
                {index + 1} / {total}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
