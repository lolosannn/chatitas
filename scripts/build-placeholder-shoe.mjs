// Genera un modelo "greybox" de zapatilla con partes separadas y nombradas,
// para poder construir toda la arquitectura del configurador mientras se
// encarga el modelo 3D definitivo al modelador. La nomenclatura usada acá
// es la que debe respetar el archivo final (ver docs/fase1-modelo-3d.md).
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';
import path from 'node:path';

// GLTFExporter usa FileReader (API de navegador) para el export binario; en Node lo shimeamos con Blob.arrayBuffer().
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
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeSharedMaterial(name, color, { metalness = 0.05, roughness = 0.85 } = {}) {
  const material = new THREE.MeshStandardMaterial({ color, metalness, roughness });
  material.name = `mat_${name}`;
  return material;
}

// --- Suela exterior (outsole) ---
{
  const shape = new THREE.Shape();
  shape.moveTo(-0.09, -0.35);
  shape.quadraticCurveTo(-0.1, -0.1, -0.085, 0.15);
  shape.quadraticCurveTo(-0.075, 0.32, 0, 0.38);
  shape.quadraticCurveTo(0.075, 0.32, 0.085, 0.15);
  shape.quadraticCurveTo(0.1, -0.1, 0.09, -0.35);
  shape.quadraticCurveTo(0.06, -0.42, 0, -0.42);
  shape.quadraticCurveTo(-0.06, -0.42, -0.09, -0.35);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  const mesh = makeMesh('sole_outsole', geo, '#2b2b2b', { roughness: 0.95 });
  mesh.position.set(0, 0, 0);
  root.add(mesh);
}

// --- Entresuela (midsole) ---
{
  const shape = new THREE.Shape();
  shape.moveTo(-0.08, -0.33);
  shape.quadraticCurveTo(-0.09, -0.08, -0.078, 0.14);
  shape.quadraticCurveTo(-0.068, 0.3, 0, 0.35);
  shape.quadraticCurveTo(0.068, 0.3, 0.078, 0.14);
  shape.quadraticCurveTo(0.09, -0.08, 0.08, -0.33);
  shape.quadraticCurveTo(0.055, -0.39, 0, -0.39);
  shape.quadraticCurveTo(-0.055, -0.39, -0.08, -0.33);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2);
  const mesh = makeMesh('sole_midsole', geo, '#f2f2f2', { roughness: 0.6 });
  mesh.position.set(0, 0.045, 0);
  root.add(mesh);
}

// --- Cuerpo / capellada (upper body) ---
{
  const geo = new THREE.CapsuleGeometry(0.11, 0.42, 8, 16);
  geo.rotateX(Math.PI / 2);
  geo.scale(1, 0.62, 1.15);
  const mesh = makeMesh('upper_body', geo, '#c0392b', { roughness: 0.7 });
  mesh.position.set(0, 0.155, -0.02);
  mesh.scale.set(1, 1, 1);
  root.add(mesh);
}

// --- Puntera (toe cap) ---
{
  const geo = new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
  geo.scale(1.05, 0.7, 1.1);
  const mesh = makeMesh('upper_toe_cap', geo, '#ffffff', { roughness: 0.55 });
  mesh.position.set(0, 0.135, 0.32);
  mesh.rotation.x = Math.PI;
  root.add(mesh);
}

// --- Talonera (heel counter) ---
{
  const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16, 1, false, 0, Math.PI);
  geo.scale(1, 1, 0.8);
  const mesh = makeMesh('upper_heel_counter', geo, '#1c1c1c', { roughness: 0.5 });
  mesh.position.set(0, 0.165, -0.36);
  mesh.rotation.y = Math.PI;
  root.add(mesh);
}

// --- Lengüeta (tongue) ---
{
  const geo = new THREE.BoxGeometry(0.09, 0.14, 0.015);
  const mesh = makeMesh('tongue', geo, '#e0e0e0', { roughness: 0.8 });
  mesh.position.set(0, 0.195, 0.15);
  mesh.rotation.x = -1.05;
  root.add(mesh);
}

// --- Cordones (laces) como conjunto de segmentos cruzados, un solo material compartido ---
{
  const laceGroup = new THREE.Group();
  laceGroup.name = 'laces';
  const lacesMaterial = makeSharedMaterial('laces', '#f5f5f5', { roughness: 0.9 });
  const segGeo = new THREE.CapsuleGeometry(0.007, 0.075, 4, 6);
  const zPositions = [0.22, 0.16, 0.1, 0.04];
  zPositions.forEach((z, i) => {
    const left = makeMesh(`laces_strand_${i}_a`, segGeo.clone(), null, { material: lacesMaterial });
    left.rotation.z = Math.PI / 3.2;
    left.rotation.x = -0.55;
    left.position.set(-0.028, 0.185, z);
    const right = makeMesh(`laces_strand_${i}_b`, segGeo.clone(), null, { material: lacesMaterial });
    right.rotation.z = -Math.PI / 3.2;
    right.rotation.x = -0.55;
    right.position.set(0.028, 0.185, z);
    laceGroup.add(left, right);
  });
  root.add(laceGroup);
}

// --- Ojales (eyelets), un solo material compartido ---
{
  const eyeletGroup = new THREE.Group();
  eyeletGroup.name = 'eyelets';
  const eyeletsMaterial = makeSharedMaterial('eyelets', '#b0b0b0', { metalness: 0.6, roughness: 0.35 });
  const ringGeo = new THREE.TorusGeometry(0.011, 0.004, 8, 12);
  const zPositions = [0.22, 0.16, 0.1, 0.04];
  zPositions.forEach((z, i) => {
    const left = makeMesh(`eyelet_${i}_a`, ringGeo.clone(), null, { material: eyeletsMaterial });
    left.rotation.x = Math.PI / 2;
    left.position.set(-0.085, 0.165, z);
    const right = makeMesh(`eyelet_${i}_b`, ringGeo.clone(), null, { material: eyeletsMaterial });
    right.rotation.x = Math.PI / 2;
    right.position.set(0.085, 0.165, z);
    eyeletGroup.add(left, right);
  });
  root.add(eyeletGroup);
}

// --- Logo / franja lateral (accent panel, para probar imagen personalizada) ---
{
  const geo = new THREE.PlaneGeometry(0.16, 0.07, 4, 4);
  const mesh = makeMesh('upper_logo_patch', geo, '#ffffff', { roughness: 0.5 });
  mesh.position.set(0.115, 0.17, -0.02);
  mesh.rotation.y = Math.PI / 2.3;
  root.add(mesh);
}

// --- Contorno de suela (piso de contacto) ---
{
  const geo = new THREE.BoxGeometry(0.17, 0.012, 0.75);
  const mesh = makeMesh('sole_tread', geo, '#101010', { roughness: 1 });
  mesh.position.set(0, -0.006, 0);
  root.add(mesh);
}

root.rotation.y = 0;
root.position.set(0, 0, 0);

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
