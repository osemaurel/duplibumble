import "server-only";

import sharp from "sharp";

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

export async function flouter(original: ArrayBuffer): Promise<Buffer> {
  const reduite = await sharp(Buffer.from(original))
    .rotate()
    .resize({ width: GOULOT })
    .toBuffer();

  return sharp(reduite)
    .blur(1.3)
    .resize({ width: 640 })
    .jpeg({ quality: 72 })
    .toBuffer();
}
