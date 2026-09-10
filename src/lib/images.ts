import "server-only";

import sharp from "sharp";

/**
 * Fabrication des images servies par l'application.
 *
 * Ce travail revenait jusqu'ici à l'optimiseur de Next, c'est-à-dire à Vercel,
 * qui le facture au nombre d'images sources. Le quota épuisé, `/_next/image` a
 * répondu « paiement requis » et toutes les photos du site ont disparu d'un
 * coup — sans que rien dans le code n'ait changé. Un service compté n'a pas sa
 * place sur le chemin d'une image de vitrine.
 *
 * `sharp` était déjà là pour flouter les photos privées ; il redimensionne
 * aussi bien. Les réponses sont mises en cache par le relais pendant une heure
 * et servies périmées pendant un jour : le calcul n'a lieu qu'au premier appel.
 */

/** Largeurs servies. Une demande hors liste est ramenée à la plus proche. */
const LARGEURS = [160, 320, 480, 640, 960, 1280] as const;

export function largeurAdmise(demandee: number | null): number {
  if (!demandee || !Number.isFinite(demandee)) return 640;
  return LARGEURS.reduce((retenue, l) =>
    Math.abs(l - demandee) < Math.abs(retenue - demandee) ? l : retenue,
  );
}

/**
 * Redimensionne et recomprime une photo pour l'affichage.
 *
 * WebP plutôt qu'AVIF : le gain d'AVIF ne compense pas son temps d'encodage
 * quand c'est notre propre fonction qui le paie, à chaque photo qui sort du
 * cache. `withoutEnlargement` évite de fabriquer du vide à partir d'un
 * original plus petit que la taille demandée.
 */
export async function redimensionner(original: ArrayBuffer, largeur: number): Promise<Buffer> {
  return sharp(Buffer.from(original))
    .rotate()
    .resize({ width: largeur, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer();
}

/**
 * Floute une photo pour un visiteur qui n'a pas payé pour la voir.
 *
 * Le flou n'est pas un effet appliqué par-dessus : c'est une perte
 * d'information. La photo est d'abord réduite à une vingtaine de pixels de
 * large, et c'est cette réduction qui protège — le détail n'existe plus dans
 * le fichier, aucun zoom ne le fera réapparaître. Le reste, flou léger puis
 * agrandissement, ne sert qu'à rendre le résultat présentable.
 *
 * Il reste assez pour donner envie : la silhouette, la chevelure, les
 * couleurs, l'atmosphère de la pièce. Il ne reste rien pour reconnaître un
 * visage.
 *
 * ATTENTION — deux `resize` sur la même chaîne sharp ne s'enchaînent pas : le
 * second efface le premier. C'est le piège dans lequel la première version est
 * tombée, et il ne se voit pas : la réduction était ignorée, seul survivait un
 * flou de rayon 3 sur l'image en pleine résolution, c'est-à-dire presque rien.
 * Les photos privées sont restées parfaitement lisibles jusqu'à ce qu'on les
 * regarde vraiment. D'où les deux passes séparées ci-dessous, avec un tampon
 * matérialisé entre elles : la réduction doit être écrite en octets pour être
 * irréversible.
 */

/** Largeur du goulot. C'est elle, et elle seule, qui détruit le détail. */
const GOULOT = 22;

export async function flouter(original: ArrayBuffer, largeur: number): Promise<Buffer> {
  const reduite = await sharp(Buffer.from(original))
    .rotate()
    .resize({ width: GOULOT })
    .toBuffer();

  return sharp(reduite)
    .blur(1.3)
    .resize({ width: largeur })
    .webp({ quality: 72 })
    .toBuffer();
}
