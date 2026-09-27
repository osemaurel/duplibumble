/**
 * Pixel Meta : identifiant, consentement, et envoi d'événements.
 *
 * L'identifiant est en clair, et c'est normal : il part dans le HTML de chaque
 * page, tout visiteur peut le lire. Ce n'est pas un secret, c'est une
 * référence de compte publicitaire.
 *
 * Le pixel est un traceur publicitaire, pas une mesure interne : il dépose un
 * cookie et transmet la navigation à Meta. Sur un site en français vendant en
 * euros, cela demande un accord préalable et explicite du visiteur — c'est
 * l'article 82 de la loi Informatique et Libertés, et la CNIL a déjà sanctionné
 * son absence. Tout ce fichier tourne donc autour d'une seule règle : sans
 * « oui » enregistré, le script n'est jamais chargé et les fonctions
 * ci-dessous ne font rien.
 */

export const PIXEL = "2592164601281616";

/** Où le choix du visiteur est mémorisé, dans son propre navigateur. */
export const CLE_CONSENTEMENT = "palab.publicite";

/**
 * Signal interne prévenant les composants montés qu'un choix vient de changer.
 * Le stockage local n'émet `storage` que vers les *autres* onglets : sans ce
 * signal, refuser depuis la page de confidentialité ne se verrait nulle part
 * dans l'onglet courant.
 */
export const SIGNAL_CONSENTEMENT = "palab:consentement";

export type Consentement = "oui" | "non";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Le choix mémorisé, ou `null` si le visiteur n'a pas encore répondu. */
export function lireConsentement(): Consentement | null {
  if (typeof window === "undefined") return null;
  try {
    const valeur = window.localStorage.getItem(CLE_CONSENTEMENT);
    return valeur === "oui" || valeur === "non" ? valeur : null;
  } catch {
    // Navigation privée verrouillée, stockage refusé par une extension : on ne
    // peut rien mémoriser, donc rien n'a été accepté. L'absence de pixel est
    // le repli sûr, dans les deux sens du terme.
    return null;
  }
}

export function enregistrerConsentement(choix: Consentement) {
  try {
    window.localStorage.setItem(CLE_CONSENTEMENT, choix);
  } catch {
    // Le choix ne survivra pas à la fermeture de l'onglet, mais il vaut pour
    // la visite en cours : le signal ci-dessous suffit à l'appliquer.
  }
  window.dispatchEvent(new CustomEvent(SIGNAL_CONSENTEMENT, { detail: choix }));
}

/**
 * Efface les cookies posés par Meta.
 *
 * Retirer son accord doit être aussi simple que le donner. Le script déjà
 * chargé, lui, ne se décharge pas : c'est un rechargement de page qui s'en
 * débarrasse, et l'appelant s'en charge.
 */
export function oublierCookiesMeta() {
  if (typeof document === "undefined") return;
  for (const nom of ["_fbp", "_fbc"]) {
    document.cookie = `${nom}=; max-age=0; path=/`;
    document.cookie = `${nom}=; max-age=0; path=/; domain=.${window.location.hostname}`;
  }
}

/**
 * Signale un événement standard (`PageView`, `Purchase`, `Contact`…).
 *
 * Sans pixel chargé — refus, choix pas encore fait, bloqueur de publicité —
 * l'appel ne fait rien. Les appelants n'ont donc aucune condition à écrire :
 * ils décrivent ce qui vient de se produire, et c'est tout.
 */
export function evenementMeta(nom: string, parametres?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", nom, parametres);
}

/** Même chose pour un événement propre à Palab, hors de la liste de Meta. */
export function evenementPerso(nom: string, parametres?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("trackCustom", nom, parametres);
}
