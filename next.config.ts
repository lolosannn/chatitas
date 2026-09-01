import type { NextConfig } from "next";

// GitHub Pages sirve este repo en https://<usuario>.github.io/<repo>/, así
// que en el build de CI (ver .github/workflows/deploy-pages.yml) hay que
// anteponer el basePath con el nombre del repo, seteando NEXT_BASE_PATH
// (ej. "/chatitas") antes de `next build`. En local no está seteada y la
// app corre en la raíz, sin basePath.
//
// Esta variable solo se lee acá (Node, build time) — no hace falta que sea
// NEXT_PUBLIC_ ni que el bundler la inline en el cliente. Los assets
// estáticos referenciados a mano en componentes cliente resuelven el
// basePath solos vía rutas relativas (ver src/lib/asset-path.ts).
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
