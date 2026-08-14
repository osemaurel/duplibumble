import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Un classeur de collecte dépasse largement la limite par défaut
  // des actions serveur, qui est d'un mégaoctet.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  /* config options here */
};

export default nextConfig;
