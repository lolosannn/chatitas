# Fase 1 — Modelo 3D y materiales

## Objetivo

Definir cómo tiene que estar armado el archivo `.glb` del zapato para que el
configurador pueda, en tiempo real:

1. Identificar cada parte pintable/personalizable del zapato.
2. Cambiarle el color, aplicarle una imagen del usuario, o cambiar su
   material (cuero, gamuza, malla) sin tocar código — solo por nombre.

Esto se resuelve con **una convención de nomenclatura**, no con lógica
especial en el visor. El código de Fase 3 en adelante es agnóstico al
modelo real: solo necesita que el archivo respete esta convención.

## Estado actual: placeholder "greybox"

Como el modelo definitivo todavía no existe, se generó un placeholder
programático (`scripts/build-placeholder-shoe.mjs` → exporta
`public/models/shoe-placeholder.glb`) con la topología mínima para probar
toda la arquitectura: 8 partes configurables, materiales por nombre, y UVs
básicos. **No es representativo de la estética final** — es un boceto para
validar el pipeline (carga → detección de partes → cambio de
color/textura → export), aunque a partir de la segunda versión (chata/
ballerina, ver más abajo) ya tiene una silueta reconocible como zapato, no
solo volúmenes genéricos. Cuando llegue el modelo real del modelador, se
reemplaza el archivo y el resto de la app sigue funcionando igual, siempre
que respete la misma convención.

**Actualización — pivot a chata/ballerina:** la primera versión del
placeholder era una zapatilla deportiva genérica (cordones, lengüeta,
suela con entresuela) armada con cápsulas y cilindros simples — leía como
un "blob", no como un zapato. Se rehizo por completo con un perfil de
horma real (contorno de pie: talón angosto, ancho en el metatarso, punta
redondeada) y se cambió el tipo de calzado a **chata/ballerina** (más
simple de modelar bien de forma procedural, y el tipo de calzado que
importa mostrar primero). La tabla de partes de abajo y
`src/lib/configurator/shoe-parts.ts` reflejan esta segunda versión —
cordones/ojales/lengüeta ya no existen como partes, se reemplazaron por
Ribete, Pulsera y Aplique.

Como referencia visual (no versionada en el repo por peso) se evaluó el
modelo público [`MaterialsVariantsShoe`](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe)
de Khronos glTF-Sample-Assets — sirve como ejemplo de topología/UV de una
zapatilla real, pero **no** se usa como placeholder funcional porque es un
solo mesh con variantes de textura completa, no partes separadas por
material.

## Convención de nomenclatura (obligatoria para el modelo definitivo)

### 1. Un material por zona configurable, compartido entre mallas

Cada parte configurable del zapato debe tener **un solo material**, nombrado:

```
mat_<part_id>
```

Ese material se asigna a **todas** las mallas que visualmente pertenecen a
esa parte, aunque sean varias (ej. los 8 segmentos de cordón comparten
`mat_laces`). Así, pintar/texturizar una parte es una sola actualización de
material — no hace falta viajar el árbol de nodos ni acoplar el código a la
jerarquía exacta del modelo.

Los nombres de los **nodos/mallas** en sí no importan para la lógica (pueden
llamarse como el modelador prefiera); lo que el código lee es el nombre del
**material**.

### 2. Tabla de partes configurables (v1)

Definida en código en `src/lib/configurator/shoe-parts.ts` (fuente de
verdad — esta tabla es solo para referencia rápida):

| `part_id`             | Nombre visible | Categoría | Color | Imagen | Material físico |
|------------------------|----------------|-----------|:-----:|:------:|:----------------:|
| `sole_outsole`          | Suela          | sole      | ✅    | ❌     | ✅               |
| `heel_taco`             | Taco           | sole      | ✅    | ❌     | ❌               |
| `upper_body`            | Cuerpo         | upper     | ✅    | ✅     | ✅               |
| `upper_toe_cap`         | Puntera        | upper     | ✅    | ✅     | ✅               |
| `upper_heel_counter`    | Talonera       | upper     | ✅    | ✅     | ✅               |
| `trim`                  | Ribete         | accent    | ✅    | ❌     | ❌               |
| `strap`                 | Pulsera        | accent    | ✅    | ❌     | ✅               |
| `applique`              | Aplique        | accent    | ✅    | ✅     | ❌               |

Si el modelo definitivo necesita partes nuevas (ej. `laterals`, `heel_tab`,
`lining`), se agregan a esta tabla y a `shoe-parts.ts` — no requiere cambios
en el visor ni en el estado, ambos iteran la lista dinámicamente (Fase 2/3).

### 3. Requisitos de UV

- Cada parte necesita su **propio espacio UV en el canal `TEXCOORD_0`**,
  sin solapamiento entre sí (no usar UV compartido/atlas cruzado entre
  partes distintas), para poder aplicar una imagen subida por el usuario a
  una sola parte sin que "salpique" a otras.
- Rango 0–1, sin overlaps internos severos (evitar estirones extremos) para
  que un logo subido por el usuario no se vea distorsionado.
- No hace falta lightmap / `TEXCOORD_1` — no se usa lightmapping horneado.

### 4. Especificaciones técnicas para el modelador 3D

Para que el archivo definitivo funcione sin cambios de código:

- **Formato de entrega:** `.glb` (binario, texturas embebidas o vía
  `KHR_texture_transform` si aplica). Draco compression opcional pero
  recomendado si el archivo pesa mucho (>10–15 MB).
- **Escala/unidades:** metros, escala real de un zapato (~0.30 m de largo).
  Origen/pivote del modelo en el piso, centrado en el eje X y Z, mirando
  hacia +Z.
- **Poly count:** optimizado para tiempo real en navegador — apuntar a
  30k–80k triángulos totales para el par (o 15k–40k por zapato individual).
- **Materiales:** PBR estándar (`MeshStandardMaterial` / metallic-roughness
  workflow), sin shaders custom. Un material por `part_id` según la tabla,
  con nombre exacto `mat_<part_id>`.
- **Texturas base:** color base neutro claro (blanco/gris) en las partes
  donde el usuario va a poder aplicar color/imagen, para que el tint no se
  vea afectado por una textura de fábrica oscura.
- **Sin animaciones ni cámaras embebidas** en el glTF (el control de cámara
  lo maneja el visor).

## Cómo se probó

- `scripts/inspect-model.mjs`: inspecciona nodos, mallas, materiales y UVs
  de cualquier `.glb` (usa `@gltf-transform/core`). Se usó para verificar
  que el placeholder expone 8 materiales (uno por parte), y en la Fase 3
  se detectó con esta misma herramienta que la primera versión tenía 8 de
  10 materiales sin `.name` — el visor solo reconocía las 2 partes que
  compartían material explícitamente asignado.
- QA visual con capturas reales del visor (`scripts/screenshot-model-preview.mjs`,
  vía Playwright) desde varios ángulos (3/4, cenital, perfil) — el perfil
  lateral fue clave para detectar que el borde superior del cuerpo salía
  como una rampa triangular en vez de una curva (función de altura con un
  "codo" en el pico, sin continuidad de derivada entre sus dos mitades).

## Próximo paso (Fase 2)

Con las partes y la convención de materiales ya definidas, la Fase 2 arma
el estado del configurador: un store (Zustand) tipado en base a
`SHOE_PARTS`, que guarda por cada `part_id` la selección actual (color,
imagen, material) y expone las acciones para modificarla.
