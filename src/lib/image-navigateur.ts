/**
 * Réduction d'une photo avant son envoi, dans le navigateur.
 *
 * Jusqu'ici le fichier partait tel que l'appareil l'avait produit. Un
 * téléphone récent sort des photos de trois à cinq mégaoctets ; le site, lui,
 * n'en sert jamais plus de 1280 pixels de large, soit une cinquantaine de
 * kilooctets. On stockait donc soixante fois ce qu'on affichait.
 *
 * Ce n'est pas resté théorique : cinq cent trente-huit photos ont rempli
 * 1,6 Go, le projet a dépassé son quota de stockage, et le fournisseur a
 * restreint le service — plus personne ne pouvait se connecter au site.
 *
 * La réduction se fait ici plutôt que sur le serveur, pour une raison
 * pratique : le fichier y est déjà. L'agent au bout d'une connexion lente
 * envoie deux cents kilooctets au lieu de quatre mégaoctets, et n'attend plus.
 */

/** Le site n'affiche jamais plus large ; au-delà, on stocke pour personne. */
const COTE_MAX = 1600;
const QUALITE = 0.82;

/**
 * Rend une version réduite, ou `null` s'il vaut mieux garder l'original.
 *
 * `null` n'est pas un échec à signaler : un HEIC que le navigateur ne sait pas
 * décoder, une image déjà petite, un canevas indisponible. L'appelant envoie
 * alors le fichier d'origine, comme avant. Mieux vaut une photo lourde qu'une
 * photo perdue.
 */
export async function reduirePourStockage(fichier: File): Promise<File | null> {
  if (typeof document === "undefined" || !fichier.type.startsWith("image/")) return null;

  const adresse = URL.createObjectURL(fichier);

  try {
    const image = await charger(adresse);

    // On passe par une balise `img` plutôt que par `createImageBitmap` : les
    // navigateurs y appliquent d'eux-mêmes l'orientation EXIF. Sans cela, une
    // photo prise à la verticale serait réencodée couchée — et l'orientation
    // disparaissant au réencodage, elle le resterait pour toujours.
    const facteur = Math.min(1, COTE_MAX / Math.max(image.naturalWidth, image.naturalHeight));
    const largeur = Math.round(image.naturalWidth * facteur);
    const hauteur = Math.round(image.naturalHeight * facteur);
    if (!largeur || !hauteur) return null;

    const toile = document.createElement("canvas");
    toile.width = largeur;
    toile.height = hauteur;

    const pinceau = toile.getContext("2d");
    if (!pinceau) return null;

    pinceau.drawImage(image, 0, 0, largeur, hauteur);

    const blob = await new Promise<Blob | null>((rendre) =>
      toile.toBlob(rendre, "image/webp", QUALITE),
    );

    // Un WebP plus lourd que l'original n'a aucun intérêt : cela arrive sur
    // une image déjà compressée, ou minuscule.
    if (!blob || blob.size >= fichier.size) return null;

    const racine = fichier.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${racine}.webp`, { type: "image/webp" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

function charger(adresse: string): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const image = new Image();
    image.onload = () => resoudre(image);
    image.onerror = () => rejeter(new Error("image illisible"));
    image.src = adresse;
  });
}
