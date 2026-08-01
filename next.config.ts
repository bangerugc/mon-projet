import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise les requêtes dev depuis 127.0.0.1 (utilisé par les E2E Playwright)
  // sans quoi Next.js émet un warning cross-origin sur les assets /_next/*.
  allowedDevOrigins: ["127.0.0.1"],
  // Masque l'indicateur de dev Next.js (rond en bas à gauche) : purement dev,
  // il recouvrait la 1re puce du WordRail. Absent en prod de toute façon.
  devIndicators: false,
  // ffmpeg fait des require dynamiques + embarque un binaire natif : on empêche
  // Next de le bundler (sinon MODULE_NOT_FOUND). Résolu au runtime côté serveur.
  serverExternalPackages: ["fluent-ffmpeg", "@ffmpeg-installer/ffmpeg"],
};

export default nextConfig;
