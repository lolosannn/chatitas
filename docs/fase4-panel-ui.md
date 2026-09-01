# Fase 4 — Panel de personalización UI

## Objetivo

Interfaz para elegir una parte del zapato, cambiarle color/material/imagen,
y que quede en sincronía bidireccional con el visor 3D de la Fase 3: elegir
una parte en el panel resalta esa parte en el modelo, y clickear una parte
en el modelo expande sus controles en el panel — porque los dos leen y
escriben el mismo store de Zustand (Fase 2), no hay estado duplicado.

## Dónde está

- `src/components/configurator/ConfiguratorPanel.tsx` — el panel completo
  (lista de partes por categoría + controles de la parte activa).
- `src/lib/read-file-as-data-url.ts` — helper chico para convertir el
  archivo de imagen subido a `data:` URL (ver Fase 1: sin backend, todo en
  memoria del navegador).
- `src/app/page.tsx` — layout: `<ShoeCanvas>` a la izquierda (flex-1),
  `<ConfiguratorPanel>` a la derecha (ancho fijo `w-80`), reemplazando el
  header flotante de las fases anteriores.

## Cómo funciona

- **Lista por categoría**: `SHOE_PARTS` (Fase 1) se agrupa por
  `category` (Cuerpo, Cordones, Detalles, Suela) — agregar una parte nueva
  al modelo solo requiere tocar `shoe-parts.ts`, el panel no tiene nada
  hardcodeado por parte.
- **Selección = acordeón**: cada fila es un botón que llama
  `selectPart(partId)` (o `null` si ya estaba seleccionada, mismo toggle
  que el clic en el visor). La fila expandida muestra sus controles;
  `selectedPartId` del store es la única fuente de verdad de "qué está
  expandido", no hay estado local de UI separado.
- **Hover cruzado**: pasar el mouse por una fila del panel llama
  `hoverPart(partId)` / `hoverPart(null)` igual que el visor — así
  también se puede ubicar una parte en el modelo pasando el mouse por la
  lista, sin tener que encontrarla a ojo en el 3D.
- **Controles condicionados por `supports`**: el selector de material solo
  aparece si `part.supports.material`, el de imagen solo si
  `part.supports.image` — usa la misma tabla de la Fase 1, no una copia.
- **Imagen**: un `<input type="file">` oculto, disparado por un botón
  estilizado; `readFileAsDataUrl` lo convierte a `data:` URL y
  `setPartImage` lo guarda en el store, que la Fase 3 ya sabe aplicar como
  `material.map`. "Quitar" limpia la selección (`setPartImage(id, null)`).

## Cómo se probó

Con Playwright manejando el panel real (sin mocks) contra `next dev`:

- Click en una fila → se expande y el visor muestra el outline azul de esa
  parte (confirma la sincronización panel → store → visor).
- Click en un swatch de color → el modelo cambia de color al instante.
- Click en una variante de material (Gamuza) → cambia visiblemente el
  brillo/rugosidad del material en el visor.
- Subida de una imagen de prueba (PNG generado en el propio script, sin
  depender de un archivo externo) → aparece como textura sobre la malla
  correspondiente y como miniatura en el panel; "Quitar" la saca de ambos
  lados.
- Se corrió también contra la build de producción (export estático con
  `NEXT_BASE_PATH`) para confirmar que nada de esto depende del modo dev.

Ver `scripts/test-panel.mjs`.

## Próximo paso (Fase 5)

Con todo el flujo de personalización funcionando, la Fase 5 agrega: captura
del `<canvas>` en alta resolución (ya con todas las personalizaciones
aplicadas) y un resumen del pedido en JSON armado a partir de
`useConfiguratorStore.getState().parts` — sin backend por ahora (Fase 1),
así que el resultado es para descargar/copiar, no para persistir en un
servidor.
