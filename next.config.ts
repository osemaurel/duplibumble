import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un classeur de collecte dépasse largement la limite par défaut
  // des actions serveur, qui est d'un mégaoctet.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },

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
