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

**Actualización — modelo generado con IA (v3, el activo hoy):** la silueta
procedural (v2) seguía sin convencer visualmente por más ajustes de
geometría — el techo real de "modelado a mano por código" se había
alcanzado. Se generó un modelo con [Meshy AI](https://www.meshy.ai)
(imagen→3D de una chata negra, licencia **Privado** — no CC BY, para uso
comercial propio) y se procesó para integrarlo:

1. El export original (glTF-Binary, "Smart Topology") viene como **un solo
   mesh, sin materiales ni UVs**, con normales pero sin ningún dato que
   permita separar partes — el toggle "Dividir" de Meshy no generó
   materiales/primitivas distintas en el `.glb` exportado.
2. `scripts/smooth-mesh.mjs` — suavizado Laplaciano (5 iteraciones) para
   sacar ruido de reconstrucción de la superficie (picos/dentado en zonas
   de baja confianza del escaneo).
3. `scripts/simplify-real-model.mjs` — decimación con `@gltf-transform/functions`
   (`simplify` + `MeshoptSimplifier`) de ~400k a ~30k triángulos, apto para
   tiempo real en navegador.
4. `scripts/process-real-model.mjs` — reorienta (el eje más largo pasa a
   Z), escala a ~0.29 m de largo real, y **separa geométricamente por
   posición** en 4 partes: `sole_outsole` (franja inferior por altura),
   y dentro del resto, `upper_heel_counter` / `upper_body` / `upper_toe_cap`
   por posición a lo largo del eje Z (los extremos son puntera/talonera,
   el resto cuerpo). Cada grupo se exporta como una primitiva con su propio
   material `mat_<part_id>`.

**Limitaciones conocidas de este enfoque** (a diferencia de un modelo
modelado/segmentado a mano):

- Es una separación por **posición**, no por costura real — los bordes
  entre partes son aproximados (funcionan bien para "pintar la puntera de
  otro color", no son anatómicamente exactos).
- **Sin UVs** → no se puede aplicar una imagen subida por el usuario a
  ninguna parte todavía (`supports.image` en `false` en las 4). Si se
  regenera el modelo con UVs, se reactiva por parte.
- No hay partes para Ribete/Pulsera/Aplique/Taco — son detalles de
  superficie sin región geométrica propia en este mesh; para tenerlos hace
  falta un modelo con esas piezas ya separadas (por el generador o edición
  manual en un editor 3D).
- El mesh original tenía una costura irregular (no watertight) en una
  primera generación; se resolvió pidiendo una nueva generación con mejores
  parámetros (Smart Topology en vez de Alto detalle, más resolución de
  visión), no arreglando la malla — más fácil regenerar bien que reparar.

**Actualización — segmentación manual en Blender (v4, el activo hoy):** la
separación geométrica por posición de la v3 se veía "desprolija" (bordes
aproximados, no anatómicos). Se pidió al usuario segmentar a mano: abrió el
`.glb` de la v3 en Blender y usó `Mesh → Separate → Selection` para partir
el modelo en objetos/nodos distintos por selección real de caras, no por
heurística de posición.

El archivo resultante (`Untitled.glb`, ~13 MB, subido vía GitHub Release
por el límite de 25 MB de la web de GitHub) tenía **5 mallas**, con
bounding boxes fuertemente superpuestas entre sí — no se podía saber a
simple vista cuáles eran partes reales y cuáles sobrantes. Se resolvió con
una técnica de aislamiento: `scripts/isolate-meshes.mjs` exporta cada malla
del archivo a su propio `.glb` (todos los demás nodos descartados +
`prune()`), permitiendo renderizar y ver cada una por separado
(`scripts/test-real-model-parts.mjs` + capturas). De las 5, solo
`Mesh_0.001` era basura real (un fragmento suelto sin relación con el
zapato, de un recorte rápido sin terminar) — las otras 4 eran partes
reales: talonera, ribete (la tira que rodea el escote), cuerpo principal, y
`Mesh_0` — que en el visor por defecto (una sola luz, sin `DoubleSide`)
renderiza como líneas finas dispersas y **se descartó por error en la
primera integración**, creyéndola un sobrante de costuras.

**Corrección — la suela sí estaba ahí:** renderizando `Mesh_0` aislada
desde abajo (visor three.js standalone con luces por ambos lados, ver
`scripts/finalize-blender-model.mjs` para el pipeline y el bounding box
verificado por separado) se ve con claridad que es el contorno de la
planta del zapato — coincide exactamente con la silueta del resto de las
partes. No es un disco cerrado sino un borde/tira delgada (el "canto" de
la suela), así que con material de una sola cara (`DoubleSide: false`,
default) se vuelve invisible al mirarla de frente o desde abajo por
backface culling — de ahí que a simple vista pareciera solo líneas sueltas.
Se corrigió marcando su material como `doubleSided` en
`finalize-blender-model.mjs` (`material.setDoubleSided(true)`, solo para
`sole_outsole` — las demás partes son superficies cerradas y no lo
necesitan). `scripts/debug-color-parts.mjs` (un color plano distinto por
malla) se usó como verificación cruzada de las 4 partes reales antes de
descartar la única sobrante.

`scripts/finalize-blender-model.mjs` integra el resultado: descarta la
malla sobrante por índice, reorienta/centra/escala el conjunto a ~0.29 m
de largo real, y le asigna a cada malla real su material
`mat_<part_id>` (`sole_outsole`, `upper_heel_counter`, `trim`,
`upper_body`).

**Bug encontrado y corregido:** la primera integración quedó con el zapato
desplazado fuera de cuadro (se veía cortado por el borde superior/izquierdo
del visor). La causa: cada nodo conservado del `.glb` de Blender traía su
propia traslación (`T ≈ [0.009, 0.085, -0.002]`, igual en los 3 —
heredada del pivote/origen del objeto en la escena original de Blender),
que vive en el **nodo**, no en los vértices de la malla. El script solo
reescribía el accessor `POSITION` (espacio local de la malla) sin tocar esa
transformación del nodo, así que three.js la volvía a aplicar en el
render, encima del recentrado — el resultado combinado tiraba el modelo
lejos del origen. Se corrigió horneando la matriz de cada nodo
(`node.getMatrix()`) en los vértices antes de centrar/escalar, y
reseteando el nodo a identidad (T=0, R=identidad, S=1).

**Estado de partes en v4:** 4 partes reales (Cuerpo, Talonera, Ribete,
Suela) — todavía no hay Puntera separada en este corte (el usuario no la
segmentó en Blender). Sin UVs → `image` sigue en `false` en las cuatro. La
vía de mejora es la misma que en v3: si el usuario segmenta más partes o
agrega UVs en una futura edición, se agranda `shoe-parts.ts` sin tocar el
resto del código.

**Actualización — modelo re-exportado con objetos ya nombrados (v5, el
activo hoy):** para la siguiente vuelta, en vez de pedirle al usuario que
edite el modelo v3 (auto-segmentado, feo) desde cero, se le pidió
directamente **nombrar cada objeto** en Blender antes de exportar
(`cuerpo`, `Ribete`, `Suela`, `Talonera`). El archivo resultante
(`zapatoooo.glb`, ~30 MB, subido al mismo release de GitHub) tenía **4
nodos, los 4 con nombre y sin ningún sobrante** — cero mallas basura que
aislar y adivinar, y sin el bug de traslación heredada del nodo (esta vez
los 4 nodos tenían T=[0,0,0] limpio).

Se armó `scripts/finalize-named-model.mjs`, una versión del integrador que
mapea **nombre de nodo → part_id** (normalizado a minúsculas/sin acentos)
en vez de por índice — mucho más robusto que adivinar por posición en la
lista, y ya no depende de que el orden de export coincida con lo esperado.
Mismo tratamiento que v4 en lo demás: hornea la matriz de cada nodo en los
vértices, recentra/escala a ~0.29 m, asigna `mat_<part_id>` por malla, y
marca `sole_outsole` como `doubleSided`.

**Bug nuevo encontrado y corregido — decimación no reducía nada:** este
archivo venía muchísimo más pesado (~513k triángulos combinados, contra
~260-400k de los anteriores) y con una relación vértices/triángulos de
casi 2:1 — normal cuando el export trae **normales por-cara** (cada
vértice único por su normal, no solo por posición; común en re-exports
donde se pierde el smoothing original). `weld()` (que en esta versión de
`@gltf-transform/functions` solo fusiona vértices **bitwise idénticos**,
sin usar `tolerance` para nada — se comprobó forzando tolerancias mucho
más grandes sin ningún cambio) no encontraba duplicados porque la normal
distinta ya alcanza para que dos vértices con la misma posición cuenten
como distintos. Con eso, `simplify()` (MeshoptSimplifier) trata cada uno
de esos bordes como una costura de atributo y se niega a colapsarlos —
por más que se le pida un `ratio` bajo o un `error` alto, la reducción real
quedaba en ~2-4%.

Se corrigió borrando el atributo `NORMAL` de cada primitiva **antes** de
`weld()`+`simplify()` (ahora el weld sí fusiona por posición: de 591k a
152k vértices solo en el cuerpo) y recalculando normales suaves **a mano**
después de decimar (acumulando la normal de cada cara, ponderada por su
área/producto cruz sin normalizar, en cada vértice que la comparte, y
normalizando al final — ver `computeSmoothNormals()` en
`scripts/simplify-real-model.mjs`). Se probó primero el helper `normals()`
de `@gltf-transform/functions`, pero en mallas de este tamaño vaciaba los
índices de la primitiva (quedaba con 0 triángulos) — se descartó por ese
bug y se optó por la cuenta manual. Resultado: ~513k → ~51k triángulos
totales (1 MB), con sombreado suave correcto (mejor incluso que las
versiones anteriores, que habían quedado con un aspecto algo facetado).

**Estado de partes en v5:** mismas 4 partes que v4 (Cuerpo, Talonera,
Ribete, Suela), esta vez sin necesidad de descartar ninguna malla —
integración limpia de punta a punta. Sigue sin haber Puntera ni UVs.

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

### 2. Tabla de partes configurables (actual — v4, segmentado a mano en Blender)

Definida en código en `src/lib/configurator/shoe-parts.ts` (fuente de
verdad — esta tabla es solo para referencia rápida):

| `part_id`             | Nombre visible | Categoría | Color | Imagen | Material físico |
|------------------------|----------------|-----------|:-----:|:------:|:----------------:|
| `upper_body`            | Cuerpo         | upper     | ✅    | ❌     | ✅               |
| `upper_heel_counter`    | Talonera       | upper     | ✅    | ❌     | ✅               |
| `trim`                  | Ribete         | accent    | ✅    | ❌     | ❌               |
| `sole_outsole`          | Suela          | sole      | ✅    | ❌     | ❌               |

`image` está en `false` en las cuatro porque el modelo activo no trae UVs
(ver más abajo) — se reactiva parte por parte apenas el modelo lo soporte.
Todavía no hay `upper_toe_cap` en este corte (existió en la v3 por
separación geométrica, ver historial arriba) porque el usuario no la
separó como malla propia en Blender. `sole_outsole` es geométricamente un
borde/tira delgada (no un disco cerrado) — su material va con
`doubleSided: true` para que no se vuelva invisible de un lado (ver detalle
más arriba). Si el modelo definitivo agrega partes nuevas (`upper_toe_cap`,
o `strap`/`applique`/`heel_taco` de la v2 procedural), se agregan a esta
tabla y a `shoe-parts.ts` — no requiere cambios en el visor ni en el
estado, ambos iteran la lista dinámicamente (Fase 2/3).

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
- Para el modelo real (v3): se verificó con la misma técnica de bordes
  abiertos (`findBoundaryLoops` en `process-real-model.mjs`, cuenta edges
  compartidos por un solo triángulo) que la malla es watertight (0 bordes
  abiertos) antes de aceptarla. Y se probó la segmentación por posición
  clickeando cada zona en el visor real y aplicando un color distinto por
  parte (`scripts/test-real-model-parts.mjs`) para confirmar que "Puntera"
  cae del lado correcto (el extremo más ancho/redondeado, no el angosto).
- Para el modelo segmentado a mano (v4): `scripts/isolate-meshes.mjs` +
  capturas para distinguir mallas reales de sobrantes (ver arriba), y luego
  QA en el visor real: click en cada parte (Cuerpo/Talonera/Ribete/Suela)
  para confirmar que el contorno de selección cae sobre la región correcta,
  y cambio de color en una parte para confirmar que no "salpica" a las
  demás. Este mismo QA fue el que detectó el bug de traslación del nodo
  (el zapato aparecía cortado fuera de cuadro) descrito arriba — se
  confirmó comparando el bounding box combinado antes/después del fix con
  el mismo script de inspección de nodos usado para diagnosticarlo.
- La mala clasificación inicial de `Mesh_0` (descartada como "sobrante"
  cuando en realidad era la suela) se detectó porque el usuario la
  reconoció directamente en el archivo original de Blender — no por QA
  automático. Para verificarla antes de reintegrarla se armó un visor
  three.js standalone fuera de la app (Playwright + `three.module.js` +
  `GLTFLoader`/`OrbitControls` locales del propio `node_modules/three`,
  sin depender de red externa) con vistas fijas top/bottom/front/side/iso,
  que confirmó que su silueta desde abajo coincide exactamente con la
  planta del zapato.
- Para el modelo con nodos ya nombrados (v5): mismo QA en el visor real
  (click por parte + outline + cambio de color) que en v4. El hallazgo de
  esta vuelta no fue de segmentación sino de rendimiento de la
  decimación — se detectó comparando el conteo de triángulos/vértices por
  primitiva antes/después de cada paso del pipeline (weld → simplify →
  normals) con inspección directa vía `@gltf-transform/core`, lo que
  aisló que `weld()` no fusionaba ningún vértice pese a tolerancias cada
  vez más grandes, y que el helper `normals()` vaciaba los índices — ver
  el bug documentado arriba.

## Próximo paso (Fase 2)

Con las partes y la convención de materiales ya definidas, la Fase 2 arma
el estado del configurador: un store (Zustand) tipado en base a
`SHOE_PARTS`, que guarda por cada `part_id` la selección actual (color,
imagen, material) y expone las acciones para modificarla.
