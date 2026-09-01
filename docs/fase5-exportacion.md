# Fase 5 — Exportación y renderizado final

## Objetivo

Cerrar el flujo del configurador: que el usuario pueda llevarse su diseño
—una imagen en alta resolución y un resumen de lo que eligió— sin depender
de un backend (decisión ya tomada en la Fase 1).

## Dónde está

- `src/lib/configurator/capture.ts` — `captureControllerRef`: el puente
  entre el `<Canvas>` de R3F (donde vive el `WebGLRenderer`) y el botón del
  panel, que está fuera del árbol de React Three Fiber.
- `src/components/configurator/ShoeCanvas.tsx` — agrega `CaptureController`
  (un componente sin salida visual, montado dentro del `<Canvas>`) que
  registra la función de captura real.
- `src/lib/configurator/order-summary.ts` — arma el JSON del pedido a
  partir del store.
- `src/lib/download-blob.ts` — dispara la descarga de cualquier `Blob` en
  el navegador (imagen o JSON), sin subir nada a ningún lado.
- `src/components/configurator/ConfiguratorPanel.tsx` — sección
  `ExportControls` con los dos botones, al pie del panel.

## Cómo funciona

### Captura en alta resolución

El `<canvas>` de WebGL solo tiene los píxeles que ocupa en pantalla — para
que la descarga sea "alta resolución" de verdad (no un recorte de lo que
se ve en el monitor), `captureHighRes`:

1. Sube el `pixelRatio` del renderer (por defecto a 3x, con un techo de
   ~4096px de lado para no reventar memoria en equipos modestos).
2. Vuelve a llamar `gl.setSize(width, height, false)` — el `false` es
   clave: cambia la resolución interna del buffer de dibujo sin tocar el
   tamaño CSS del canvas, así no hay ningún salto visual.
3. Fuerza un render manual (`gl.render(scene, camera)`) a esa resolución
   más alta y lo exporta con `gl.domElement.toBlob(..., "image/png")`.
4. Restaura el `pixelRatio` y tamaño originales y vuelve a renderizar,
   para que el visor en pantalla quede exactamente como estaba.

Esto requiere `gl={{ preserveDrawingBuffer: true }}` en el `<Canvas>` —
sin eso, el navegador puede limpiar el buffer antes de que `toBlob`
alcance a leerlo.

**La imagen sale con fondo transparente** (el `<canvas>` no tiene
`scene.background` seteado; el fondo oscuro que se ve en la app es CSS del
contenedor, no algo que WebGL dibuje). Es intencional: una captura
transparente es más útil para un pedido/catálogo real (se puede pegar
sobre cualquier fondo) que una con el fondo de la UI incrustado.

### Resumen del pedido

`buildOrderSummary` recorre `SHOE_PARTS` (Fase 1) y por cada parte resuelve
el color contra `COLOR_PALETTE` (si coincide con un swatch conocido, guarda
también su nombre) y el material contra `MATERIAL_VARIANTS`, además de si
tiene imagen cargada y su nombre de archivo. Se descarga como `.json`
prolijo (indentado), pensado para que la diseñadora lo pueda leer
directamente o pasarlo a un sistema de pedidos más adelante.

## Cómo se probó

Con Playwright manejando la app real (`scripts/test-export.mjs`):

- Se personalizó una parte (color rojo en el cuerpo) y se descargaron
  ambos archivos con los botones reales del panel.
- Se verificó el PNG descargado: **2640×2400px** con el viewport de
  prueba en 1200×800 (canvas visible ~880×800 tras descontar el panel) ×
  pixelRatio 3 — confirma que el escalado de resolución funciona como se
  espera, no es solo un recorte de pantalla.
- Se verificó el JSON descargado: 10 partes, cada una con el color/label
  correcto (`upper_body` reflejó el rojo recién aplicado).
- Se repitió contra la build de producción (export estático con
  `NEXT_BASE_PATH`) servida bajo un subpath simulado, sin errores de
  consola ni requests fallidos.

## Estado del proyecto

Con esto están cubiertas las 5 fases originales. El flujo completo —
cargar el modelo, elegir y personalizar cada parte (color, material,
imagen), y exportar el resultado— funciona de punta a punta sobre el
placeholder. Lo que sigue, cuando esté listo, es un trabajo de
_reemplazo_, no de arquitectura:

- Cambiar `public/models/shoe-placeholder.glb` por el modelo definitivo del
  modelador (misma convención `mat_<part_id>`, ver
  `docs/fase1-modelo-3d.md`) — nada más del código debería necesitar
  cambios.
- Si más adelante se necesita persistir pedidos (no solo descargarlos), se
  agrega un backend liviano que reciba el mismo JSON de
  `buildOrderSummary` más la imagen — no hace falta rediseñar el estado.
