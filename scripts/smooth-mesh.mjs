// Suavizado Laplaciano simple: cada vértice se acerca al promedio de sus
// vecinos conectados por una arista. A diferencia de la simplificación
// (que reduce triángulos pero puede preservar picos/ruido para no alterar
// la silueta), esto SÍ aplana ruido de alta frecuencia en la superficie.
import { NodeIO, Accessor } from '@gltf-transform/core';

const inPath = process.argv[2];
const outPath = process.argv[3];
const iterations = Number(process.argv[4] ?? '3');
const factor = Number(process.argv[5] ?? '0.5');

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();
const prim = root.listMeshes()[0].listPrimitives()[0];
const posAccessor = prim.getAttribute('POSITION');
const positions = posAccessor.getArray().slice();
const indices = prim.getIndices().getArray();
const vertexCount = positions.length / 3;

const neighbors = Array.from({ length: vertexCount }, () => new Set());
for (let t = 0; t < indices.length; t += 3) {
  const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
  neighbors[a].add(b).add(c);
  neighbors[b].add(a).add(c);
  neighbors[c].add(a).add(b);
}

let current = positions;
for (let iter = 0; iter < iterations; iter++) {
  const next = current.slice();
  for (let v = 0; v < vertexCount; v++) {
    const nbrs = neighbors[v];
    if (nbrs.size === 0) continue;
    let sx = 0, sy = 0, sz = 0;
    for (const n of nbrs) {
      sx += current[n * 3];
      sy += current[n * 3 + 1];
      sz += current[n * 3 + 2];
    }
    const avgX = sx / nbrs.size;
    const avgY = sy / nbrs.size;
    const avgZ = sz / nbrs.size;
    next[v * 3] = current[v * 3] + (avgX - current[v * 3]) * factor;
    next[v * 3 + 1] = current[v * 3 + 1] + (avgY - current[v * 3 + 1]) * factor;
    next[v * 3 + 2] = current[v * 3 + 2] + (avgZ - current[v * 3 + 2]) * factor;
  }
  current = next;
}

const newPosAccessor = doc.createAccessor('position_smoothed').setType(Accessor.Type.VEC3).setArray(current);
prim.setAttribute('POSITION', newPosAccessor);

await io.write(outPath, doc);
console.log('Suavizado', iterations, 'iteraciones, factor', factor, '->', outPath);
