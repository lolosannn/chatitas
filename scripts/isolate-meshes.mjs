import { NodeIO } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';

const inPath = process.argv[2];
const outDir = process.argv[3];

const io = new NodeIO();
const baseDoc = await io.read(inPath);
const meshCount = baseDoc.getRoot().listMeshes().length;

for (let i = 0; i < meshCount; i++) {
  const doc = await io.read(inPath);
  const root = doc.getRoot();
  const nodes = root.listNodes();
  for (let n = 0; n < nodes.length; n++) {
    if (n !== i) nodes[n].dispose();
  }
  await doc.transform(prune());
  await io.write(`${outDir}/isolated_${i}.glb`, doc);
  console.log('Escrito isolated_' + i + '.glb');
}
