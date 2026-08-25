import type { ReactNode } from "react";

import Photo from "@/components/site/photo";
import type { LadyStatus } from "@/lib/supabase/types";

/**
 * Briques visuelles communes aux espaces admin et agent. Les mettre ici évite
 * qu'un statut ou un avatar ne prenne six apparences différentes selon
 * l'écran qui l'affiche.
 */

/** Teinte stable déduite du texte : la même personne garde sa couleur. */
function teinte(source: string) {
  let somme = 0;
  for (let i = 0; i < source.length; i += 1) somme += source.charCodeAt(i);
  return somme % 6;
}

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  nom,
  url,
  petit = false,
}: {
  nom: string;
  url?: string | null;
  petit?: boolean;
}) {
  const classe = `bo-avatar t${teinte(nom)}${petit ? " sm" : ""}`;

  if (url) {
    // Une pastille de quarante pixels ne doit pas télécharger l'original de
    // trois mégaoctets. Les photos servies par notre route passent donc par
    // l'optimiseur. Les URL signées de Supabase, elles, ne peuvent pas y
    // passer : elles changent à chaque rendu, et l'optimiseur ne saurait pas
    // les mettre en cache. On ne les rencontre que côté modération, où le
    // volume est faible et la fidélité de l'image compte davantage.
    const optimisable = url.startsWith("/");

    return (
      <span className={classe}>
        {optimisable ? (
          <Photo src={url} alt="" sizes={petit ? "34px" : "42px"} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        )}
      </span>
    );
  }

  return (
    <span className={classe} aria-hidden="true">
      {initiales(nom) || "?"}
    </span>
  );
}

const STATUT: Record<LadyStatus, { libelle: string; ton: string }> = {
  draft: { libelle: "Brouillon", ton: "neutre" },
  pending_review: { libelle: "À valider", ton: "attente" },
  published: { libelle: "Publiée", ton: "ok" },
  rejected: { libelle: "Refusée", ton: "refus" },
  suspended: { libelle: "Suspendue", ton: "suspendu" },
};

export function PastilleStatut({
  statut,
  libelle,
}: {
  statut: LadyStatus;
  libelle?: string;
}) {
  const { libelle: parDefaut, ton } = STATUT[statut];
  return <span className={`bo-pastille ${ton}`}>{libelle ?? parDefaut}</span>;
}

export function libelleStatut(statut: LadyStatus) {
  return STATUT[statut].libelle;
}

export function Pastille({
  ton,
  children,
}: {
  ton: "neutre" | "attente" | "ok" | "refus" | "suspendu";
  children: ReactNode;
}) {
  return <span className={`bo-pastille ${ton}`}>{children}</span>;
}

export function EtatVide({
  icone,
  titre,
  texte,
  action,
}: {
  icone: ReactNode;
  titre: string;
  texte: string;
  action?: ReactNode;
}) {
  return (
    <div className="bo-vide">
      <span className="rond">{icone}</span>
      <h3>{titre}</h3>
      <p>{texte}</p>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- icônes */

export const IconeMessages = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.7L3 21l1.9-5a8.4 8.4 0 0 1-.8-3.6 8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 8.5 8.4Z" />
  </svg>
);

export const IconeFemmes = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4.5" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const IconeAgents = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.2a3.6 3.6 0 0 1 0 6.9M17.5 14.4a6.5 6.5 0 0 1 4 5.6" />
  </svg>
);

export const IconeTableau = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7.5" height="8.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="2" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
  </svg>
);

export const IconeSignalements = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.5 21 20H3l9-16.5Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </svg>
);

export const IconePhoto = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="10.5" r="1.8" />
    <path d="m4 17 4.5-4.2a2 2 0 0 1 2.7 0L16 17" />
  </svg>
);

export const IconeMembres = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7.5" r="3.8" />
    <path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" />
    <path d="M3 12.5h1.6M19.4 12.5H21" />
  </svg>
);

export const IconeImport = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v11" />
    <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
    <path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
  </svg>
);
