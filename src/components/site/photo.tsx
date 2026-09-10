import Image from "next/image";

/**
 * Une photo de la vitrine.
 *
 * Toutes les images du site passent par ici, pour une raison simple : les
 * originaux déposés par les agents pèsent trois mégaoctets pièce. Servis tels
 * quels dans une vignette de deux cents pixels, ils faisaient une page
 * d'accueil à plusieurs dizaines de mégaoctets.
 *
 * Le redimensionnement est fait par notre propre route, `/api/photos`, et non
 * par l'optimiseur de Next. Celui-ci est un service compté par l'hébergeur :
 * son quota épuisé, il a répondu « paiement requis » et toutes les photos du
 * site ont disparu d'un coup, sans qu'une ligne de code ait changé. Une
 * vitrine ne peut pas dépendre d'un compteur.
 *
 * `largeur` remplace donc le rôle qu'avait `sizes` : c'est elle qui décide du
 * poids réellement téléchargé. Elle doit correspondre à la place occupée à
 * l'écran, doublée pour les écrans fins.
 */

/** Adresse servie par l'application, seule à savoir se redimensionner. */
const INTERNE = "/api/photos";

export default function Photo({
  src,
  alt,
  sizes,
  prioritaire = false,
  className,
  ajustement = "cover",
  largeur = 640,
}: {
  src: string;
  alt: string;
  /** Conservé pour la mise en page ; le poids se règle par `largeur`. */
  sizes: string;
  /** Vrai pour les images visibles d'emblée : elles sont chargées sans attendre. */
  prioritaire?: boolean;
  className?: string;
  /**
   * `cover` recadre pour remplir le cadre — c'est ce que veulent les vignettes.
   * `contain` montre la photo entière : indispensable en plein écran, où
   * recadrer reviendrait à couper ce qu'on est venu regarder.
   */
  ajustement?: "cover" | "contain";
  /** Largeur demandée à la route, en pixels d'image. */
  largeur?: number;
}) {
  // Les profils de démonstration sont des fichiers statiques : ils ne passent
  // pas par la route et n'ont donc pas de largeur à demander.
  const adresse = src.startsWith(INTERNE) ? `${src}?l=${largeur}` : src;

  return (
    <Image
      src={adresse}
      alt={alt}
      fill
      sizes={sizes}
      // L'optimiseur est court-circuité : c'est notre route qui a déjà fabriqué
      // la bonne taille. Il l'est aussi par nécessité pour les photos privées
      // débloquées — il les retéléchargerait sans les cookies du visiteur, et
      // mettrait le résultat dans un cache commun à tous.
      unoptimized
      priority={prioritaire}
      loading={prioritaire ? "eager" : "lazy"}
      className={className}
      style={{ objectFit: ajustement }}
    />
  );
}
