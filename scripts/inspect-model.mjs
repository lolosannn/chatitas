import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsVariants } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions([KHRMaterialsVariants]);
const path = process.argv[2] ?? 'public/models/shoe.glb';
const doc = await io.read(path);
const root = doc.getRoot();

console.log(`\n=== ${path} ===`);
console.log(`Scenes: ${root.listScenes().length}`);
console.log(`Nodes: ${root.listNodes().length}`);
console.log(`Meshes: ${root.listMeshes().length}`);
console.log(`Materials: ${root.listMaterials().length}`);
console.log(`Textures: ${root.listTextures().length}`);

console.log('\n--- Node tree ---');
function printNode(node, depth = 0) {
  const mesh = node.getMesh();
  const meshInfo = mesh ? ` [mesh: ${mesh.getName() || '(sin nombre)'}]` : '';
  console.log('  '.repeat(depth) + `- ${node.getName() || '(sin nombre)'}${meshInfo}`);
  for (const child of node.listChildren()) printNode(child, depth + 1);
}
for (const scene of root.listScenes()) {
  for (const node of scene.listChildren()) printNode(node);
}

console.log('\n--- Meshes & primitives ---');
for (const mesh of root.listMeshes()) {
  console.log(`Mesh: ${mesh.getName() || '(sin nombre)'}`);
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial();
    const uv0 = prim.getAttribute('TEXCOORD_0');
    const uv1 = prim.getAttribute('TEXCOORD_1');
    console.log(
      `  primitive -> material: ${mat ? mat.getName() || '(sin nombre)' : 'ninguno'}` +
      `, UV0: ${uv0 ? 'si' : 'no'}, UV1: ${uv1 ? 'si' : 'no'}`
    );
  }
}

console.log('\n--- Materials ---');
for (const mat of root.listMaterials()) {
  const baseColorTex = mat.getBaseColorTexture();
  console.log(`Material: ${mat.getName() || '(sin nombre)'}`);
  console.log(`  baseColorFactor: ${JSON.stringify(mat.getBaseColorFactor())}`);
  console.log(`  metallic: ${mat.getMetallicFactor()}, roughness: ${mat.getRoughnessFactor()}`);
  console.log(`  baseColorTexture: ${baseColorTex ? baseColorTex.getName() || baseColorTex.getURI() || '(embebida)' : 'ninguna'}`);
  console.log(`  normalTexture: ${mat.getNormalTexture() ? 'si' : 'no'}`);
}

const variantsExt = doc.getRoot().listExtensionsUsed().find(e => e.extensionName === 'KHR_materials_variants');
if (variantsExt) {
  console.log('\n--- KHR_materials_variants ---');
  console.log('(usa variantes de material -> revisar con three.js GLTFLoader/plugin para mapping completo)');
}
