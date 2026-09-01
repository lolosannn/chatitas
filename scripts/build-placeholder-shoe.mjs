// Genera un modelo "greybox" de chata/ballerina con partes separadas y
// nombradas, para poder construir toda la arquitectura del configurador
// mientras se encarga el modelo 3D definitivo al modelador. La nomenclatura
// usada acá es la que debe respetar el archivo final (ver docs/fase1-modelo-3d.md).
//
// A diferencia de la primera versión (cápsulas genéricas), la silueta acá
// sale de un perfil de horma real (contorno de pie visto desde arriba:
// talón angosto, ancho en el metatarso, puntera redondeada) extruido y
// "achatado" en la parte de atrás para simular el corte bajo típico de una
// chata. Sigue siendo un placeholder — no busca reemplazar al modelador.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';
import path from 'node:path';

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        })
        .catch((err) => {
          if (this.onerror) this.onerror(err);
        });
    }
  };
}

const root = new THREE.Group();
root.name = 'Shoe';

function makeMesh(name, geometry, color, { metalness = 0.05, roughness = 0.85, material: sharedMaterial } = {}) {
  const material = sharedMaterial ?? new THREE.MeshStandardMaterial({ color, metalness, roughness });
  if (!sharedMaterial) {
    material.name = `mat_${name}`;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// --- Perfil de horma (contorno de pie visto desde arriba) ---
// y: -HEEL_Y (talón) .. +TOE_Y (punta). x: ancho.
const HEEL_Y = 0.135;
const TOE_Y = 0.158;
const SOLE_LENGTH = HEEL_Y + TOE_Y;

function footOutline(scale = 1) {
  const s = scale;
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.135 * s);
  shape.quadraticCurveTo(0.034 * s, -0.135 * s, 0.03 * s, -0.09 * s);
  shape.quadraticCurveTo(0.024 * s, -0.03 * s, 0.03 * s, 0.01 * s);
  shape.quadraticCurveTo(0.046 * s, 0.05 * s, 0.044 * s, 0.09 * s);
  shape.quadraticCurveTo(0.04 * s, 0.13 * s, 0.016 * s, 0.15 * s);
  shape.quadraticCurveTo(0, 0.158 * s, -0.016 * s, 0.15 * s);
  shape.quadraticCurveTo(-0.04 * s, 0.13 * s, -0.044 * s, 0.09 * s);
  shape.quadraticCurveTo(-0.046 * s, 0.05 * s, -0.03 * s, 0.01 * s);
  shape.quadraticCurveTo(-0.024 * s, -0.03 * s, -0.03 * s, -0.09 * s);
  shape.quadraticCurveTo(-0.034 * s, -0.135 * s, 0, -0.135 * s);
  return shape;
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Perfil de altura del borde superior del cuerpo a lo largo del zapato
// (t=0 talón .. t=1 punta): bajo en el talón (casi al ras, como una chata),
// sube hasta su punto más alto sobre el empeine, y baja de nuevo —moderado—
// hacia la punta. Un degradé lineal talón-punta se veía como una canoa.
// smoothstep tiene derivada cero en sus dos extremos, así que las dos mitades
// empalman en el pico sin ángulo — con Math.pow en cada mitad quedaba un
// "codo" en el pico (mismo valor pero pendientes distintas) que se veía como
// una rampa triangular en vez de una curva.
function toplineHeightFactor(t) {
  const heelFactor = 0.16;
  const toeFactor = 0.6;
  const peak = 0.58;
  if (t < peak) {
    return heelFactor + (1 - heelFactor) * smoothstep(0, peak, t);
  }
  return 1 - (1 - toeFactor) * smoothstep(peak, 1, t);
}

// Construye la pared hueca del cuerpo "a mano" (loft entre el contorno
// exterior y uno interior, con altura variable por punto según
// toplineHeightFactor). No usa ExtrudeGeometry porque su cara superior es
// un polígono plano fijo — mover los vértices después no arrastra las
// paredes laterales, que quedan con la altura original.
function buildUpperWall(outerScale, innerScale, depth, segments = 96) {
  const ref = footOutline(1).getPoints(segments);
  const outerPts = footOutline(outerScale).getPoints(segments);
  const innerPts = footOutline(innerScale).getPoints(segments);
  const n = ref.length;

  const positions = [];
  const indices = [];
  const vBase = (i, which) => i * 4 + which; // 0=outerBottom 1=outerTop 2=innerBottom 3=innerTop

  for (let i = 0; i < n; i++) {
    const t = THREE.MathUtils.clamp((ref[i].y + HEEL_Y) / SOLE_LENGTH, 0, 1);
    const h = depth * toplineHeightFactor(t);
    const o = outerPts[i];
    const inn = innerPts[i];
    positions.push(o.x, 0, -o.y);
    positions.push(o.x, h, -o.y);
    positions.push(inn.x, 0, -inn.y);
    positions.push(inn.x, h, -inn.y);
  }

  for (let i = 0; i < n - 1; i++) {
    const a = i;
    const b = i + 1;
    // pared exterior (cara visible desde afuera)
    indices.push(vBase(a, 0), vBase(b, 0), vBase(b, 1));
    indices.push(vBase(a, 0), vBase(b, 1), vBase(a, 1));
    // pared interior (cara visible desde adentro de la abertura)
    indices.push(vBase(a, 2), vBase(b, 3), vBase(b, 2));
    indices.push(vBase(a, 2), vBase(a, 3), vBase(b, 3));
    // borde superior (conecta el aro exterior con el interior a la misma altura)
    indices.push(vBase(a, 1), vBase(b, 1), vBase(b, 3));
    indices.push(vBase(a, 1), vBase(b, 3), vBase(a, 3));
    // base inferior (apoya contra la suela)
    indices.push(vBase(a, 0), vBase(b, 2), vBase(b, 0));
    indices.push(vBase(a, 0), vBase(a, 2), vBase(b, 2));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// --- Suela ---
{
  const geo = new THREE.ExtrudeGeometry(footOutline(1), {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 24,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = makeMesh('sole_outsole', geo, '#111111', { roughness: 0.95 });
  root.add(mesh);
}

// --- Taco (leve elevación del talón, típica de una bailarina con taquito) ---
{
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.135);
  shape.quadraticCurveTo(0.032, -0.135, 0.028, -0.095);
  shape.quadraticCurveTo(0.02, -0.075, 0, -0.072);
  shape.quadraticCurveTo(-0.02, -0.075, -0.028, -0.095);
  shape.quadraticCurveTo(-0.032, -0.135, 0, -0.135);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = makeMesh('heel_taco', geo, '#111111', { roughness: 0.6 });
  mesh.position.set(0, -0.014, 0);
  root.add(mesh);
}

const UPPER_DEPTH = 0.088;

// --- Cuerpo (upper hueco: pared entre el contorno exterior y una abertura interior) ---
{
  const geo = buildUpperWall(0.95, 0.68, UPPER_DEPTH);
  const material = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });
  material.name = 'mat_upper_body';
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'upper_body';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

// --- Ribete (piping fino que recorre el borde superior del cuerpo) ---
{
  const rimPoints2D = footOutline(0.95).getPoints(80);
  const rimPoints3D = rimPoints2D.map((p) => {
    const t = THREE.MathUtils.clamp((p.y + HEEL_Y) / SOLE_LENGTH, 0, 1);
    return new THREE.Vector3(p.x, UPPER_DEPTH * toplineHeightFactor(t) + 0.001, -p.y);
  });
  const curve = new THREE.CatmullRomCurve3(rimPoints3D, true, 'catmullrom', 0.15);
  const geo = new THREE.TubeGeometry(curve, 160, 0.0035, 8, true);
  const mesh = makeMesh('trim', geo, '#111111', { roughness: 0.5 });
  root.add(mesh);
}

// --- Puntera (pequeño domo superpuesto sobre la punta, como un refuerzo) ---
{
  const geo = new THREE.SphereGeometry(0.03, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1);
  geo.scale(1, 0.5, 1.05);
  const mesh = makeMesh('upper_toe_cap', geo, '#f5f5f5', { roughness: 0.55 });
  mesh.position.set(0, UPPER_DEPTH * 0.55, -0.145);
  root.add(mesh);
}

// --- Talonera (pequeño domo superpuesto en la parte de atrás) ---
{
  const geo = new THREE.SphereGeometry(0.024, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.1);
  geo.scale(1, 0.45, 0.9);
  const mesh = makeMesh('upper_heel_counter', geo, '#f5f5f5', { roughness: 0.55 });
  mesh.position.set(0, UPPER_DEPTH * 0.22, 0.132);
  root.add(mesh);
}

// --- Pulsera (tira fina que cruza el empeine, estilo Mary Jane) ---
{
  const geo = new THREE.TorusGeometry(0.033, 0.0032, 8, 24, Math.PI);
  const mesh = makeMesh('strap', geo, '#f5f5f5', { roughness: 0.6 });
  mesh.position.set(0, 0.074, -0.01);
  root.add(mesh);
}

// --- Aplique (moño decorativo sobre la puntera) ---
{
  const appliqueMaterial = new THREE.MeshStandardMaterial({ color: '#b0b0b0', metalness: 0.6, roughness: 0.3 });
  appliqueMaterial.name = 'mat_applique';
  const group = new THREE.Group();
  group.name = 'applique';

  const loopGeo = new THREE.TorusGeometry(0.01, 0.0042, 10, 16, Math.PI * 1.5);
  const left = makeMesh('applique_loop_a', loopGeo.clone(), null, { material: appliqueMaterial });
  left.rotation.set(Math.PI / 2, 0, Math.PI * 0.15);
  left.position.set(-0.009, UPPER_DEPTH * 0.62, -0.128);
  const right = makeMesh('applique_loop_b', loopGeo.clone(), null, { material: appliqueMaterial });
  right.rotation.set(Math.PI / 2, 0, Math.PI - Math.PI * 0.15);
  right.position.set(0.009, UPPER_DEPTH * 0.62, -0.128);
  const knotGeo = new THREE.SphereGeometry(0.006, 12, 10);
  const knot = makeMesh('applique_knot', knotGeo, null, { material: appliqueMaterial });
  knot.position.set(0, UPPER_DEPTH * 0.62, -0.128);

  group.add(left, right, knot);
  root.add(group);
}

const scene = new THREE.Scene();
scene.add(root);

const exporter = new GLTFExporter();
const outDir = path.resolve('public/models');
fs.mkdirSync(outDir, { recursive: true });

try {
  const result = await exporter.parseAsync(scene, { binary: true });
  const buffer = Buffer.from(result);
  const outPath = path.join(outDir, 'shoe-placeholder.glb');
  fs.writeFileSync(outPath, buffer);
  console.log(`GLB exportado: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
} catch (error) {
  console.error('Error exportando GLB:', error);
  process.exit(1);
}
