/**
 * GitHub Pages sirve la app bajo /<repo>/, así que un asset estático
 * referenciado a mano (glTF, imágenes vía fetch — a diferencia de
 * next/image o next/link, que resuelven el basePath solos) tiene que
 * quedar relativo a la página actual en vez de absoluto desde la raíz del
 * dominio.
 *
 * En vez de depender de una variable NEXT_PUBLIC_BASE_PATH inlineada en el
 * bundle de cliente en build time, se usan rutas RELATIVAS (sin "/"
 * inicial): como `trailingSlash: true` en next.config.ts hace que cada
 * ruta se sirva como carpeta (".../ruta/index.html"), una ruta relativa
 * como "models/shoe-placeholder.glb" siempre resuelve contra la carpeta de
 * la página actual — funciona con o sin basePath, en local o en GitHub
 * Pages, sin coordinar variables de entorno entre next.config.ts y el
 * bundle. Verificado sirviendo el export estático bajo un subpath
 * simulando GitHub Pages (scripts/verify-pages-basepath.mjs).
 */
export function assetPath(path: string): string {
  if (path.charAt(0) === "/") {
    return path.substring(1);
  }
  return path;
}
