# Fase 3 — Visor 3D e interacción

## Objetivo

Conectar el modelo 3D (Fase 1) y el estado del configurador (Fase 2) en un
visor real: cámara con órbita/zoom, detección de en qué parte hizo clic el
usuario, resaltado de la parte activa/hover, y que el color/material/imagen
de cada parte en el store se refleje en tiempo real sobre el modelo.

## Dónde está

- `src/components/configurator/ShoeCanvas.tsx` — todo el visor vive acá:
  carga del modelo, sincronización estado→materiales, raycasting/eventos, y
  el resaltado con outline.
- Se sigue usando en `src/app/page.tsx` (home) tal cual desde la Fase 1.

## Cómo funciona

1. **Registro de partes** (`buildPartRegistry`): al cargar el `.glb`, se
   recorre la escena una sola vez (`useMemo`, keyed por `scene`) y arma dos
   mapas por `part_id`: `meshesByPart` (para el outline) y
   `materialsByPart` (para pintar). La convención `mat_<part_id>` de la
   Fase 1 es lo único que conecta el archivo 3D con el resto del código —
   no importa la jerarquía de nodos ni cuántas mallas tenga cada parte.
2. **Sincronización estado → materiales** (`useSyncPartsToMaterials`): un
   único `useEffect` que corre cada vez que cambia `parts` (el store) o el
   registro de materiales, y por cada parte aplica `colorHex`,
   `roughness`/`metalness` de la variante de material (si la parte los
   soporta) y la imagen subida como `material.map` (con
   `THREE.TextureLoader`, disponiendo la textura anterior al cambiar o
   sacar la imagen para no filtrar memoria).
3. **Interacción** (raycasting): los handlers `onPointerOver` /
   `onPointerOut` / `onClick` se ponen una sola vez en el `<primitive>`
   raíz — R3F hace bubbling del evento desde la malla específica que
   intersectó el rayo, así que `event.object.material.name` alcanza para
   saber en qué parte cliqueó/pasó el mouse, sin declarar un handler por
   malla. `onPointerMissed` en el `<Canvas>` deselecciona al clickear
   fondo.
4. **Resaltado**: `@react-three/postprocessing`'s `<Outline>` dibuja el
   contorno de la parte seleccionada (azul) y de la parte en hover
   (blanco, solo si es distinta de la seleccionada, para no duplicar).

## Bugs encontrados y corregidos

### 1. El placeholder tenía 8 de 10 materiales sin nombre

Al armar el registro de partes en el visor, `materialsByPart` solo
encontraba **2** de las 10 partes (`laces` y `eyelets`). Causa: en
`scripts/build-placeholder-shoe.mjs`, el refactor que compartía un único
material entre varias mallas (para cordones/ojales) agregó una función
`makeSharedMaterial` que sí asigna `material.name`, pero la rama de
`makeMesh` que crea un material nuevo para las partes "solas" (suela,
cuerpo, lengüeta, etc.) nunca le puso `.name` — quedaban materiales
válidos pero sin la convención `mat_<part_id>`, así que el visor no podía
identificarlos. Se arregló seteando `material.name` también en esa rama.
Se verificó re-inspeccionando el `.glb` con `scripts/inspect-model.mjs` y
confirmando los 10 nombres, no solo el conteo (el bug había pasado
desapercibido en la Fase 1 porque en su momento solo se miró el conteo de
materiales, no el detalle).

### 2. Outline "fantasma" al deseleccionar

Con `<EffectComposer autoClear={false}>` y pasando `selection={[]}` cuando
no hay nada resaltado, el contorno de la última parte resaltada quedaba
pegado en pantalla indefinidamente — porque `autoClear={false}` le dice al
compositor que no limpie su buffer entre frames, así que si el frame nuevo
no dibuja nada ahí, quedan los píxeles del frame anterior.

La solución no es simplemente volver a `autoClear` por defecto (`true`):
con esta combinación de versiones (`three` 0.185, `@react-three/fiber`
9.7, `@react-three/postprocessing` 3.1 / `postprocessing` 6.39) el pase de
`Outline` directamente **no llega a renderizarse** con `autoClear: true`
— se verificó de forma aislada (un `<Outline>` fijo, sin lógica de estado
de por medio, tampoco se veía). Es una interacción rara entre estas
versiones, no algo para "arreglar bien" ahora.

La solución aplicada: mantener `autoClear={false}` (necesario para que el
outline se vea) pero **desmontar el `<EffectComposer>` entero** —no solo
bajarle la selección a `[]`— apenas no hay parte seleccionada ni en hover.
Al desmontarlo, R3F vuelve a su render normal (sin compositor), así que no
hay ningún buffer sin limpiar que pueda mostrar un contorno viejo.

## Cómo se probó

Sin panel de UI todavía (eso es Fase 4), toda la verificación fue con
Playwright manejando el mouse sobre `/` en local:

- `scripts/test-interaction.mjs`: mueve el mouse sobre el cuerpo del
  zapato (outline blanco esperado), clickea para seleccionar (outline
  azul esperado), mueve y clickea en el fondo (sin outline esperado) — se
  usó para encontrar y confirmar el fix del bug #2 de arriba.
- Se repitió la build de producción (`NEXT_BASE_PATH=/chatitas npm run
  build`) servida bajo un subpath simulado (mismo método que en el setup
  de GitHub Pages) para confirmar que la interacción funciona igual en el
  export estático, no solo en `next dev`.

## Próximo paso (Fase 4)

Con el visor ya reaccionando al store y permitiendo seleccionar partes por
clic, la Fase 4 arma el panel de UI: lista de partes (con la parte activa
sincronizada con `selectedPartId`), paleta de colores, selector de
material y subida de imagen — todo llamando a las acciones del store que
ya existen desde la Fase 2 (`setPartColor`, `setPartMaterial`,
`setPartImage`).
