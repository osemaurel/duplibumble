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
  nom: "À COMPLÉTER : raison sociale",
  formeJuridique: "À COMPLÉTER : forme juridique (SAS, SARL, auto-entrepreneur…)",
  capital: "À COMPLÉTER : capital social, le cas échéant",
  immatriculation: "À COMPLÉTER : SIRET ou numéro d'immatriculation",
  tva: "À COMPLÉTER : numéro de TVA intracommunautaire",
  adresse: "À COMPLÉTER : adresse du siège social",
  pays: "À COMPLÉTER : pays",
  directeurPublication: "À COMPLÉTER : nom du directeur de la publication",
  emailContact: "À COMPLÉTER : adresse e-mail de contact",
  emailPrivacy: "À COMPLÉTER : adresse e-mail pour les données personnelles",
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
