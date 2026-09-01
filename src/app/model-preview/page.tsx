"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

/**
 * Página de QA visual para la Fase 1: solo confirma que el placeholder
 * carga, que las partes están separadas y que los materiales responden a
 * la luz como se espera. La interacción real (clic por parte, outline,
 * cámara controlada) se construye en la Fase 3.
 */
function ShoeModel() {
  const { scene } = useGLTF("/models/shoe-placeholder.glb");
  return <primitive object={scene} />;
}

export default function ModelPreviewPage() {
  return (
    <div className="h-screen w-screen bg-neutral-900">
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
    </div>
  );
}

useGLTF.preload("/models/shoe-placeholder.glb");
