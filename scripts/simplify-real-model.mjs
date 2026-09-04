// Decima el modelo con @gltf-transform/functions (MeshoptSimplifier).
//
// Si el .glb viene con normales "planas"/por-cara (cada vértice único por
// normal, no solo por posición — común en exports con shading duro o
// re-triangulados), weld() con matching bitwise no encuentra casi ningún
// duplicado (normal distinto = vértice distinto) y meshoptimizer bloquea
// el colapso de esos bordes por tratarlos como costura de atributo, así
// que simplify() apenas reduce nada por más que se le pida un ratio bajo.
// Se resuelve borrando NORMAL antes de weld/simplify (ahora sí colapsa por
// posición). El helper `normals()` de gltf-transform para recalcularlas al
// final resultó no funcionar bien acá (vacía los índices en mallas
// grandes — probado y descartado), así que las normales suaves se
// recalculan a mano (acumulando normal de cara por vértice) después de
// decimar.
import { NodeIO, Accessor } from '@gltf-transform/core';
import { simplify, weld, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const inPath = process.argv[2];
const outPath = process.argv[3];
const ratio = Number(process.argv[4] ?? '0.02');
const error = Number(process.argv[5] ?? '0.01');

function computeSmoothNormals(posArray, indexArray) {
  const vertexCount = posArray.length / 3;
  const normals = new Float32Array(posArray.length);

  const ax = new Float32Array(3);
  const bx = new Float32Array(3);
  for (let i = 0; i < indexArray.length; i += 3) {
    const ia = indexArray[i] * 3;
    const ib = indexArray[i + 1] * 3;
    const ic = indexArray[i + 2] * 3;

    ax[0] = posArray[ib] - posArray[ia];
    ax[1] = posArray[ib + 1] - posArray[ia + 1];
    ax[2] = posArray[ib + 2] - posArray[ia + 2];
    bx[0] = posArray[ic] - posArray[ia];
    bx[1] = posArray[ic + 1] - posArray[ia + 1];
    bx[2] = posArray[ic + 2] - posArray[ia + 2];

    // producto cruz (no normalizado: su magnitud pesa por área de la cara)
    const nx = ax[1] * bx[2] - ax[2] * bx[1];
    const ny = ax[2] * bx[0] - ax[0] * bx[2];
    const nz = ax[0] * bx[1] - ax[1] * bx[0];

    for (const vi of [ia, ib, ic]) {
      normals[vi] += nx;
      normals[vi + 1] += ny;
      normals[vi + 2] += nz;
    }
  }

  for (let v = 0; v < vertexCount; v++) {
    const i = v * 3;
    const x = normals[i], y = normals[i + 1], z = normals[i + 2];
    const len = Math.hypot(x, y, z) || 1;
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }
  return normals;
}

const io = new NodeIO();
const doc = await io.read(inPath);

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    prim.setAttribute('NORMAL', null);
  }
}

await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error }),
  dedup(),
  prune()
);

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION').getArray();
    const idx = prim.getIndices().getArray();
    const normalArray = computeSmoothNormals(pos, idx);
    const normalAccessor = doc
      .createAccessor(`${prim.getMaterial()?.getName() ?? 'part'}_normal`)
      .setType(Accessor.Type.VEC3)
      .setArray(normalArray);
    prim.setAttribute('NORMAL', normalAccessor);
  }
}

await io.write(outPath, doc);

const root = doc.getRoot();
let total = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices();
    const t = idx ? idx.getCount() / 3 : 0;
    total += t;
    console.log(prim.getMaterial()?.getName(), 'tris=', t, 'verts=', prim.getAttribute('POSITION').getCount());
  }
}
console.log('total triangulos:', total);
