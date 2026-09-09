import "server-only";

import sharp from "sharp";

/**
 * Floute une photo pour un visiteur qui n'a pas payé pour la voir.
 *
 * Réduire avant de flouter, puis regrandir, coûte moins cher qu'un flou
 * gaussien appliqué à pleine résolution et brouille bien davantage : les
 * détails du sujet disparaissent au lieu d'être simplement adoucis. La sortie
 * est toujours un JPEG, quel que soit le format d'origine — inutile de faire
 * mieux pour une image qu'on masque volontairement.
 */
export async function flouter(original: ArrayBuffer): Promise<Buffer> {
  return sharp(Buffer.from(original))
    .rotate()
    .resize({ width: 24, withoutEnlargement: true })
    .blur(3)
    .resize({ width: 640 })
    .jpeg({ quality: 60 })
    .toBuffer();
}
