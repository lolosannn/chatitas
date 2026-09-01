# Fase 2 — Arquitectura del estado del configurador

## Objetivo

Definir, en código, la única fuente de verdad de "qué eligió el usuario"
para cada parte del zapato — sin acoplarla todavía al visor 3D (Fase 3) ni
al panel de UI (Fase 4). Ambos van a leer/escribir este store; ninguno
define su propio estado paralelo.

## Dónde está

- `src/lib/configurator/store.ts` — store de Zustand (`useConfiguratorStore`).
- `src/lib/configurator/color-palette.ts` — paleta de colores curada (v1, 16
  colores) que usa el panel de Fase 4 y que define el color por defecto.
- `src/lib/configurator/material-variants.ts` — catálogo de materiales
  físicos (cuero, gamuza, malla, charol) con sus valores de
  `roughness`/`metalness` para `MeshStandardMaterial`, que la Fase 3 va a
  aplicar directamente al material de cada parte.
- `src/lib/configurator/shoe-parts.ts` (Fase 1) — sigue siendo la fuente de
  verdad de **qué partes existen** y qué soporta cada una; el store solo
  guarda **selecciones**, no la lista de partes.

## Forma del estado

```ts
interface PartSelection {
  colorHex: string;               // color actual, siempre presente
  materialVariantId: string | null; // null si la parte no soporta material
  image: { dataUrl: string; fileName: string } | null; // null si no hay imagen cargada
}

interface ConfiguratorState {
  parts: Record<string /* part_id */, PartSelection>;
  selectedPartId: string | null;  // parte activa en el panel/visor
  hoveredPartId: string | null;   // parte bajo el cursor (hover en el visor)

  setPartColor(partId, colorHex): void;
  setPartMaterial(partId, materialVariantId): void;
  setPartImage(partId, image): void;
  resetPart(partId): void;
  resetAll(): void;
  selectPart(partId): void;
  hoverPart(partId): void;
}
```

Ejemplo de snapshot (`parts`) con dos partes personalizadas:

```json
{
  "upper_body": {
    "colorHex": "#c0392b",
    "materialVariantId": "leather",
    "image": null
  },
  "upper_logo_patch": {
    "colorHex": "#f5f5f5",
    "materialVariantId": null,
    "image": { "dataUrl": "data:image/png;base64,...", "fileName": "logo.png" }
  }
}
```

## Decisiones de diseño

- **`parts` se inicializa recorriendo `SHOE_PARTS`** (Fase 1), no está
  hardcodeado — si el modelo definitivo agrega/saca partes, el estado se
  ajusta solo con solo tocar `shoe-parts.ts`.
- **`materialVariantId` es `null` cuando la parte no soporta material**
  (`part.supports.material === false`, ej. cordones, ojales) — así la UI
  de Fase 4 sabe, mirando el estado, si tiene que mostrar el selector de
  material para esa parte o no, sin tener que volver a consultar
  `shoe-parts.ts` en cada punto de lectura.
- **La imagen se guarda como `dataUrl` en memoria**, no se sube a ningún
  lado (decisión ya tomada en Fase 1: sin backend por ahora). Esto vive en
  el store de Zustand (memoria de la pestaña), no en `localStorage` — se
  pierde al recargar. Si más adelante se quiere persistencia entre
  recargas, se agrega el middleware `persist` de Zustand sin cambiar la
  forma del estado.
- **`selectedPartId`/`hoveredPartId` viven en el mismo store** que las
  selecciones, aunque conceptualmente son "estado de interacción" más que
  "estado del pedido" — se mantienen juntos porque el panel de Fase 4
  necesita reaccionar a cuál parte está activa en el visor de Fase 3, y
  separarlos en dos stores solo agregaría sincronización sin beneficio real
  en esta escala.
- **No se valida `colorHex` contra la paleta** — el usuario podría, a
  futuro, elegir un color libre (color picker) y no solo la paleta curada;
  el store no le pone un límite artificial a esa posibilidad aunque la UI
  de Fase 4 empiece ofreciendo solo la paleta.

## Cómo se probó

- `npx tsc --noEmit` sobre todo el proyecto (sin errores) — confirma que el
  store, tipado sobre `SHOE_PARTS`, compila y que las tres capas (Fase 1
  partes, Fase 2 estado, futuro consumo en Fase 3/4) encajan sin `any`.
- Todavía no está conectado a ningún componente visual — eso arranca en la
  Fase 3 (el visor lee `parts[id].colorHex`/`materialVariantId` para pintar
  cada mesh) y sigue en la Fase 4 (el panel llama a las acciones del
  store).

## Próximo paso (Fase 3)

Con el estado ya definido, la Fase 3 conecta el visor: cámara/zoom,
raycasting para detectar en qué parte clickeó el usuario (usando los
materiales `mat_<part_id>` de la Fase 1 para identificar la parte),
`selectPart`/`hoverPart` del store para reflejar la selección, y lectura de
`parts[id]` para pintar cada material en tiempo real.
