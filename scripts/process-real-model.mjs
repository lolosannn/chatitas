// Toma el mesh real (ya simplificado, sin materiales ni UVs) y lo prepara
// para el configurador: re-centra, reorienta (largo -> eje Z, como usa el
// resto del código), escala a metros reales, y separa geométricamente en
// partes por posición (altura para la suela, largo para puntera/talonera),
// ya que el mesh no trae materiales ni costuras que permitan separarlo con
// más detalle sin herramientas de edición 3D (Blender no está disponible
// acá). Ribete/Pulsera/Aplique NO se pueden aislar así — son detalles de
// superficie sin una región geométrica propia en este mesh.
import { NodeIO, Accessor } from '@gltf-transform/core';

const inPath = process.argv[2];
const outPath = process.argv[3];
const targetLength = Number(process.argv[4] ?? '0.29'); // metros
const soleThresholdRatio = Number(process.argv[5] ?? '0.12'); // % inferior del alto = suela
const endRatio = Number(process.argv[6] ?? '0.18'); // % de cada punta (largo) = puntera/talonera

const io = new NodeIO();
const doc = await io.read(inPath);
const root = doc.getRoot();
const mesh = root.listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const posAccessor = prim.getAttribute('POSITION');
const positions = posAccessor.getArray().slice(); // copia editable
const indices = prim.getIndices().getArray();
const vertexCount = positions.length / 3;

// --- 1. bbox original ---
let min = [Infinity, Infinity, Infinity];
let max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertexCount; i++) {
  for (let a = 0; a < 3; a++) {
    const v = positions[i * 3 + a];
    if (v < min[a]) min[a] = v;
    if (v > max[a]) max[a] = v;
  }
}
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
console.log('bbox original:', size.map((s) => s.toFixed(4)));

// El eje más largo es el largo del zapato -> lo mandamos a Z, para que
// coincida con la convención del resto del código (Z = largo, Y = alto, X = ancho).
const lengthAxis = size.indexOf(Math.max(...size));
const scale = targetLength / size[lengthAxis];
const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];

for (let i = 0; i < vertexCount; i++) {
  let x = positions[i * 3 + 0] - center[0];
  let y = positions[i * 3 + 1] - center[1];
  let z = positions[i * 3 + 2] - center[2];
  if (lengthAxis === 0) [x, z] = [z, x]; // swap X<->Z
  positions[i * 3 + 0] = x * scale;
  positions[i * 3 + 1] = y * scale;
  positions[i * 3 + 2] = z * scale;
}

// --- 2. clasificar cada triángulo por posición de su centroide ---
const newMaxY = size[1] * scale;
const soleThresholdY = newMaxY * soleThresholdRatio;

let minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < vertexCount; i++) {
  const z = positions[i * 3 + 2];
  if (z < minZ) minZ = z;
  if (z > maxZ) maxZ = z;
}
const zRange = maxZ - minZ;
const heelZ = minZ + zRange * endRatio;
const toeZ = maxZ - zRange * endRatio;

const groups = { sole_outsole: [], heel_counter_end: [], upper_body: [], toe_cap_end: [] };
for (let t = 0; t < indices.length; t += 3) {
  const a = indices[t], b = indices[t + 1], c = indices[t + 2];
  const avgY = (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3;
  const avgZ = (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3;
  if (avgY < soleThresholdY) {
    groups.sole_outsole.push(a, b, c);
  } else if (avgZ < heelZ) {
    groups.heel_counter_end.push(a, b, c);
  } else if (avgZ > toeZ) {
    groups.toe_cap_end.push(a, b, c);
  } else {
    groups.upper_body.push(a, b, c);
  }
}
for (const [name, idx] of Object.entries(groups)) {
  console.log('Triangulos', name, ':', idx.length / 3);
}

// --- 3. escribir de vuelta en el documento: un primitive por parte ---
const newPosAccessor = doc.createAccessor('position').setType(Accessor.Type.VEC3).setArray(positions);
prim.setAttribute('POSITION', newPosAccessor);

const colors = {
  sole_outsole: { hex: [0.07, 0.07, 0.07], rough: 0.9 },
  heel_counter_end: { hex: [0.85, 0.85, 0.85], rough: 0.6 }, // upper_heel_counter
  upper_body: { hex: [0.95, 0.95, 0.95], rough: 0.6 },
  toe_cap_end: { hex: [0.85, 0.85, 0.85], rough: 0.6 }, // upper_toe_cap
};
const partIds = {
  sole_outsole: 'sole_outsole',
  heel_counter_end: 'upper_heel_counter',
  upper_body: 'upper_body',
  toe_cap_end: 'upper_toe_cap',
};

let first = true;
for (const [group, idx] of Object.entries(groups)) {
  if (idx.length === 0) continue;
  const partId = partIds[group];
  const { hex, rough } = colors[group];
  const material = doc
    .createMaterial(`mat_${partId}`)
    .setBaseColorFactor([...hex, 1])
    .setRoughnessFactor(rough)
    .setMetallicFactor(0.05);
  const indexAccessor = doc
    .createAccessor(`${group}_indices`)
    .setType(Accessor.Type.SCALAR)
    .setArray(new Uint32Array(idx));

  if (first) {
    prim.setIndices(indexAccessor);
    prim.setMaterial(material);
    first = false;
  } else {
    const newPrim = doc
      .createPrimitive()
      .setAttribute('POSITION', newPosAccessor)
      .setIndices(indexAccessor)
      .setMaterial(material);
    mesh.addPrimitive(newPrim);
  }
}

await io.write(outPath, doc);
console.log('Escrito:', outPath);
