import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement des secrets confiés par les agents.
 *
 * Une clé d'API OpenAI appartient à l'agent, se facture à l'usage, et se
 * révoque mal : conservée en clair, une copie de la base — sauvegarde égarée,
 * accès d'un prestataire, requête d'administration un peu large — la livrerait
 * telle quelle. Elle est donc chiffrée avant d'arriver en base, et la clé qui
 * la déchiffre vit dans l'environnement, hors de la base : il faut les deux.
 *
 * AES-256-GCM plutôt qu'un simple chiffrement : le mode authentifie le
 * message. Un octet modifié en base fait échouer le déchiffrement au lieu de
 * rendre des données silencieusement fausses.
 *
 * `CLE_CHIFFREMENT` se fabrique une fois pour toutes :
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * La changer rend illisibles les clés déjà enregistrées — les agents devront
 * reposer la leur.
 */

const ALGO = "aes-256-gcm";
const MARQUE = "v1";

function cleMaitre(): Buffer {
  const brute = process.env.CLE_CHIFFREMENT;
  if (!brute) {
    throw new Error("CLE_CHIFFREMENT absente : impossible de chiffrer un secret.");
  }

  // Coupée aux extrémités : un espace ou un retour à la ligne attrapé au
  // collage est la façon la plus banale de rendre une clé pourtant juste
  // inutilisable, et rien à l'écran ne le montre.
  const nettoyee = brute.trim();

  // L'hexadécimal est accepté aussi : certains générateurs n'offrent que
  // cela, et une clé refusée sans raison visible coûte une heure à qui ne
  // sait pas ce qu'est le base64.
  const cle = /^[0-9a-f]{64}$/i.test(nettoyee)
    ? Buffer.from(nettoyee, "hex")
    : Buffer.from(nettoyee, "base64");

  if (cle.length !== 32) {
    throw new Error(
      `CLE_CHIFFREMENT invalide : 32 octets attendus, ${cle.length} reçus.`,
    );
  }
  return cle;
}

/** Vrai si l'environnement permet de chiffrer. Sert à désactiver proprement. */
export function chiffrementDisponible() {
  try {
    cleMaitre();
    return true;
  } catch {
    return false;
  }
}

/**
 * Pourquoi le coffre est refusé, en une phrase et sans rien révéler.
 *
 * « Absente » et « trop courte » appellent deux gestes opposés, et les
 * confondre sous un même refus envoie chercher le problème là où il n'est pas.
 * La longueur obtenue n'apprend rien à un tiers : elle est publique par
 * construction, c'est 32.
 */
export function etatCoffre(): { ok: boolean; detail: string } {
  try {
    cleMaitre();
    return { ok: true, detail: "en place" };
  } catch (erreur) {
    return {
      ok: false,
      detail: erreur instanceof Error ? erreur.message : "indisponible",
    };
  }
}

export function chiffrer(clair: string): string {
  // Un vecteur d'initialisation neuf à chaque chiffrement : le réutiliser avec
  // la même clé est précisément ce qui casse GCM.
  const vecteur = randomBytes(12);
  const chiffreur = createCipheriv(ALGO, cleMaitre(), vecteur);

  const corps = Buffer.concat([chiffreur.update(clair, "utf8"), chiffreur.final()]);
  const signature = chiffreur.getAuthTag();

  return [
    MARQUE,
    vecteur.toString("base64"),
    signature.toString("base64"),
    corps.toString("base64"),
  ].join(".");
}

/** Déchiffre, ou renvoie null si le contenu a été altéré ou la clé changée. */
export function dechiffrer(enregistre: string): string | null {
  try {
    const [marque, vecteur, signature, corps] = enregistre.split(".");
    if (marque !== MARQUE || !vecteur || !signature || !corps) return null;

    const dechiffreur = createDecipheriv(ALGO, cleMaitre(), Buffer.from(vecteur, "base64"));
    dechiffreur.setAuthTag(Buffer.from(signature, "base64"));

    return Buffer.concat([
      dechiffreur.update(Buffer.from(corps, "base64")),
      dechiffreur.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
