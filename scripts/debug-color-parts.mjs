import { NodeIO } from '@gltf-transform/core';

const inPath = process.argv[2];
const outPath = process.argv[3];

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();

const colors = [
  [1, 0, 0], // rojo
  [0, 1, 0], // verde
  [0, 0.4, 1], // azul
  [1, 1, 0], // amarillo
  [1, 0, 1], // magenta
  [0, 1, 1], // cyan
  [1, 0.5, 0], // naranja
];

let i = 0;
for (const mesh of root.listMeshes()) {
  const color = colors[i % colors.length];
  for (const prim of mesh.listPrimitives()) {
    const mat = doc.createMaterial(`debug_${i}`).setBaseColorFactor([...color, 1]).setRoughnessFactor(0.6);
    prim.setMaterial(mat);
  }
  i++;
}

await io.write(outPath, doc);
console.log('Coloreadas', i, 'mallas ->', outPath);
