// Integra el modelo editado a mano en Blender: descarta las mallas
// sobrantes (líneas de contorno duplicadas, fragmentos sueltos) y les
// asigna a las mallas reales su material mat_<part_id>, reorienta y
// escala a metros reales.
import { NodeIO, Accessor } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

// column-major 4x4 * vec3-as-point (glTF/three.js convention)
function transformPoint(m, x, y, z) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

const inPath = process.argv[2];
const outPath = process.argv[3];
const targetLength = Number(process.argv[4] ?? '0.29');

// índice de malla (orden de root.listNodes()) -> part_id, o null para descartar
const MESH_TO_PART = {
  0: null, // líneas de contorno (sobrante)
  1: null, // fragmento suelto (sobrante)
  2: 'upper_heel_counter',
  3: 'trim',
  4: 'upper_body',
};

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();
const nodes = root.listNodes();

// Blender dejó, en cada nodo conservado, una traslación/rotación/escala
// propia (heredada del "origin" del objeto en la escena original) que NO
// está en los vértices de la malla — si no la horneamos ahora, three.js la
// vuelve a aplicar en el render, encima de nuestro recentrado, y el zapato
// termina desplazado (verificado: T≈[0.009, 0.085, -0.002] en los 3 nodos,
// suficiente para tirar todo el modelo fuera de cuadro).
for (let i = 0; i < nodes.length; i++) {
  const node = nodes[i];
  if (MESH_TO_PART[i] === null || MESH_TO_PART[i] === undefined) continue;
  const m = node.getMatrix();
  const mesh = node.getMesh();
  if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    const posAccessor = prim.getAttribute('POSITION');
    const arr = posAccessor.getArray().slice();
    for (let j = 0; j < arr.length; j += 3) {
      const [x, y, z] = transformPoint(m, arr[j], arr[j + 1], arr[j + 2]);
      arr[j] = x;
      arr[j + 1] = y;
      arr[j + 2] = z;
    }
    posAccessor.setArray(arr);
  }
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  node.setScale([1, 1, 1]);
}

for (let i = 0; i < nodes.length; i++) {
  if (MESH_TO_PART[i] === null || MESH_TO_PART[i] === undefined) {
    nodes[i].dispose();
  }
}
await doc.transform(prune());

// --- bbox combinado de lo que queda, para reorientar/escalar todo junto ---
const keptMeshes = root.listMeshes();
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (const mesh of keptMeshes) {
  for (const prim of mesh.listPrimitives()) {
    const arr = prim.getAttribute('POSITION').getArray();
    for (let i = 0; i < arr.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        if (arr[i + a] < min[a]) min[a] = arr[i + a];
        if (arr[i + a] > max[a]) max[a] = arr[i + a];
      }
    }
  }
}
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
console.log('bbox combinado:', size.map((s) => s.toFixed(4)));
const lengthAxis = size.indexOf(Math.max(...size));
const scale = targetLength / size[lengthAxis];
const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];

function transform(arr) {
  for (let i = 0; i < arr.length; i += 3) {
    let x = arr[i] - center[0];
    let y = arr[i + 1] - center[1];
    let z = arr[i + 2] - center[2];
    if (lengthAxis === 0) [x, z] = [z, x];
    arr[i] = x * scale;
    arr[i + 1] = y * scale;
    arr[i + 2] = z * scale;
  }
}

const colorsByPart = {
  upper_body: [0.95, 0.95, 0.95],
  upper_heel_counter: [0.85, 0.85, 0.85],
  trim: [0.07, 0.07, 0.07],
};

let meshIdx = 0;
for (let i = 0; i < 5; i++) {
  const partId = MESH_TO_PART[i];
  if (partId === null || partId === undefined) continue;
  const mesh = keptMeshes[meshIdx++];
  for (const prim of mesh.listPrimitives()) {
    const posAccessor = prim.getAttribute('POSITION');
    const arr = posAccessor.getArray().slice();
    transform(arr);
    const newAccessor = doc.createAccessor(`${partId}_pos`).setType(Accessor.Type.VEC3).setArray(arr);
    prim.setAttribute('POSITION', newAccessor);

    const color = colorsByPart[partId] ?? [0.9, 0.9, 0.9];
    const material = doc
      .createMaterial(`mat_${partId}`)
      .setBaseColorFactor([...color, 1])
      .setRoughnessFactor(0.6)
      .setMetallicFactor(0.05);
    prim.setMaterial(material);
  }
}

await doc.transform(prune());
await io.write(outPath, doc);
console.log('Escrito:', outPath);
