import { Config } from "@remotion/cli/config";
import path from "node:path";

// Config Remotion (studio, render, bundle Lambda).
Config.setVideoImageFormat("jpeg");
Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: {
      ...(current.resolve?.alias ?? {}),
      // Résout l'alias `@/*` du tsconfig dans le bundle Remotion : c'est ce qui
      // permet de partager lib/types, lib/captions, lib/timing entre le
      // <Player> (app) et le render Lambda — une seule source de vérité (§3).
      "@": path.join(process.cwd(), "src"),
    },
  },
}));
