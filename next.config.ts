import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un classeur de collecte dépasse largement la limite par défaut
  // des actions serveur, qui est d'un mégaoctet.
  experimental: {
    // Un classeur de collecte dépasse largement la limite par défaut
    // des actions serveur, qui est d'un mégaoctet.
    serverActions: { bodySizeLimit: "10mb" },

    // Durée pendant laquelle une page déjà visitée est réutilisée telle quelle.
    // Par défaut Next remet à zéro dès qu'on quitte une page : revenir en
    // arrière refaisait donc toutes les requêtes, d'où l'attente au retour.
    // Trente secondes suffisent à rendre le retour instantané sans servir des
    // données périmées ; les fils de discussion, eux, se tiennent à jour par
    // abonnement et ne dépendent pas de ce cache.
    staleTimes: { dynamic: 30, static: 180 },
  },

  images: {
    // AVIF d'abord : sur un portrait, il pèse environ moitié moins que le WebP
    // à qualité comparable. Le navigateur qui ne le comprend pas reçoit du WebP.
    formats: ["image/avif", "image/webp"],
    // Les vignettes du site sont petites ; sans ces tailles, la plus proche
    // disponible était 640 px pour un cadre qui en fait 120.
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 384],
    // Next 16 n'accepte que les qualités déclarées ici.
    qualities: [72, 75],
    // Une variante redimensionnée reste servie un jour sans être refabriquée.
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
