import Image from "next/image";

/**
 * Une photo de la vitrine.
 *
 * Toutes les images du site passent par ici, pour une raison simple : les
 * originaux déposés par les agents pèsent trois mégaoctets pièce. Servis tels
 * quels dans une vignette de deux cents pixels, ils faisaient une page
 * d'accueil à plusieurs dizaines de mégaoctets. `next/image` fabrique la taille
 * réellement affichée, en AVIF ou WebP, et la met en cache.
 *
 * `sizes` n'est pas décoratif : c'est lui qui dit au navigateur quelle largeur
 * télécharger. Sans lui, il prend la plus grande, et tout le bénéfice est
 * perdu. Chaque appel doit donc décrire la place que l'image occupe vraiment.
 */
export default function Photo({
  src,
  alt,
  sizes,
  prioritaire = false,
  className,
  ajustement = "cover",
  optimiser = true,
}: {
  src: string;
  alt: string;
  sizes: string;
  /** Vrai pour les images visibles d'emblée : elles sont chargées sans attendre. */
  prioritaire?: boolean;
  className?: string;
  /**
   * À mettre à faux pour une image dont l'accès dépend de qui regarde.
   *
   * L'optimiseur de Next ne se contente pas de transformer l'image : il la
   * retélécharge lui-même, depuis le serveur, sans les cookies du visiteur.
   * Une adresse qui vérifie une session lui répond donc « introuvable », et
   * l'image reste vide — c'est ce qui arrivait à une photo privée tout juste
   * débloquée.
   *
   * Et quand bien même elle passerait : le résultat optimisé est mis en cache
   * par adresse, dans un cache commun à tous les visiteurs. La photo payée par
   * l'un serait alors servie à tous les autres. Contourner la vérification
   * aurait donc été pire que l'image cassée.
   */
  optimiser?: boolean;
  /**
   * `cover` recadre pour remplir le cadre — c'est ce que veulent les vignettes.
   * `contain` montre la photo entière : indispensable en plein écran, où
   * recadrer reviendrait à couper ce qu'on est venu regarder.
   */
  ajustement?: "cover" | "contain";
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={72}
      unoptimized={!optimiser}
      priority={prioritaire}
      loading={prioritaire ? "eager" : "lazy"}
      className={className}
      style={{ objectFit: ajustement }}
    />
  );
}
