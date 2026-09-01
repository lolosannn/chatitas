"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { assetPath } from "@/lib/asset-path";

const SHOE_MODEL_PATH = assetPath("/models/shoe-placeholder.glb");

/**
 * Visor 3D base: carga el modelo y lo muestra con controles de
 * órbita/zoom. Todavía sin selección de partes ni outline — eso es la
 * Fase 3. Se reutiliza como bloque de construcción para el configurador.
 */
function ShoeModel() {
  const { scene } = useGLTF(SHOE_MODEL_PATH);
  return <primitive object={scene} />;
}

export function ShoeCanvas() {
  return (
    <Canvas camera={{ position: [0.6, 0.4, 0.9], fov: 35 }} shadows>
      <Suspense fallback={null}>
        <ShoeModel />
      </Suspense>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[1, 1.5, 1]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.5} />
      <hemisphereLight args={["#ffffff", "#444444", 0.6]} />
      <OrbitControls enablePan={false} minDistance={0.4} maxDistance={2} />
    </Canvas>
  );
}

useGLTF.preload(SHOE_MODEL_PATH);
