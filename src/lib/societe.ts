/**
 * Identité de l'éditeur du site.
 *
 * Rassemblée ici parce qu'elle apparaît dans les quatre pages légales et qu'un
 * écart entre deux d'entre elles est exactement ce qu'un vérificateur relève.
 *
 * Les valeurs marquées « À COMPLÉTER » sont les seules qu'un tiers ne peut pas
 * remplir à votre place. Tant qu'elles le restent, les pages affichent un
 * avertissement bien visible : mieux vaut un manque signalé qu'une mention
 * inventée, qui serait à la fois fausse et invérifiable.
 */
export const SOCIETE = {
  // Nom commercial de l'entreprise individuelle immatriculée au RCCM de
  // Cotonou (RB/ABC/22 A 82590). Le nom patronymique de l'exploitant n'est
  // volontairement pas repris sur les pages publiques ; voir la remarque dans
  // la conversation qui a fixé cette valeur sur le statut de « directeur de la
  // publication », que le droit français exigerait nommément mais que le droit
  // béninois ne semble pas imposer de la même façon — point resté vérifié à
  // vue, pas tranché par un juriste.
  nom: "Digitips Consulting",
  formeJuridique: "entreprise individuelle de droit béninois",
  capital: "sans capital social",
  immatriculation: "RCCM Cotonou n° RB/ABC/22 A 82590",
  // Le Bénin n'est pas dans l'Union européenne : pas de TVA intracommunautaire.
  tva: "sans objet — entreprise établie hors Union européenne (Bénin)",
  adresse: "RNIE2, Îlot 637, Parcelle T, Gbodjo, Abomey-Calavi",
  pays: "Bénin",
  directeurPublication: "Digitips Consulting",
  // Adresse du domaine, maintenant qu'il est branché. Suppose qu'elle
  // redirige réellement quelque part (boîte Vercel, alias chez le
  // registraire…) — une adresse affichée qui rebondit serait pire que
  // l'ancienne, qui au moins arrivait.
  emailContact: "contact@palab.love",
  emailPrivacy: "contact@palab.love",
  hebergeur: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  // Lu depuis l'environnement pour ne jamais avoir à retoucher le code le
  // jour où le domaine change — palab.love une fois branché, ou l'adresse
  // Vercel tant qu'il ne l'est pas.
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://palab-sigma.vercel.app",
} as const;

/** Vrai tant qu'au moins une mention obligatoire n'a pas été renseignée. */
export function identiteIncomplete() {
  return Object.values(SOCIETE).some((valeur) => valeur.startsWith("À COMPLÉTER"));
}
