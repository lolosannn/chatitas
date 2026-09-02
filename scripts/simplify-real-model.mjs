import { NodeIO } from '@gltf-transform/core';
import { simplify, weld, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const inPath = process.argv[2];
const outPath = process.argv[3];
const ratio = Number(process.argv[4] ?? '0.02');

const io = new NodeIO();
const doc = await io.read(inPath);

await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }),
  dedup(),
  prune()
);

await io.write(outPath, doc);

const root = doc.getRoot();
const prim = root.listMeshes()[0].listPrimitives()[0];
console.log('Triangulos aprox:', prim.getIndices().getCount() / 3);
console.log('Vertices:', prim.getAttribute('POSITION').getCount());
