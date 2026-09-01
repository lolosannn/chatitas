"use client";

/**
 * Este componente muta objetos de three.js (materiales de un glTF cargado)
 * directamente en efectos — es el patrón estándar de R3F/drei para animar
 * o repintar una escena imperativa; esos objetos no son estado de React,
 * así que las reglas de pureza de react-hooks (pensadas para el React
 * Compiler) no aplican acá.
 */
/* eslint-disable react-hooks/immutability */

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { EffectComposer, Outline } from "@react-three/postprocessing";
import { assetPath } from "@/lib/asset-path";
import { partIdFromMaterialName, getShoePart } from "@/lib/configurator/shoe-parts";
import { getMaterialVariant } from "@/lib/configurator/material-variants";
import { useConfiguratorStore, type PartsSelectionState } from "@/lib/configurator/store";
import { captureControllerRef } from "@/lib/configurator/capture";

const SHOE_MODEL_PATH = assetPath("/models/shoe-placeholder.glb");
const textureLoader = new THREE.TextureLoader();

interface PartRegistry {
  meshesByPart: Map<string, THREE.Mesh[]>;
  materialsByPart: Map<string, THREE.MeshStandardMaterial[]>;
}

/** Recorre el modelo una sola vez y agrupa mallas/materiales por part_id (Fase 1: `mat_<part_id>`). */
function buildPartRegistry(scene: THREE.Object3D): PartRegistry {
  const meshesByPart = new Map<string, THREE.Mesh[]>();
  const materialsByPart = new Map<string, THREE.MeshStandardMaterial[]>();

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const partId = partIdFromMaterialName(material.name);
      if (!partId) continue;

      if (!meshesByPart.has(partId)) meshesByPart.set(partId, []);
      meshesByPart.get(partId)!.push(obj);

      const existing = materialsByPart.get(partId) ?? [];
      if (!existing.includes(material)) {
        materialsByPart.set(partId, [...existing, material]);
      }
    }
  });

  return { meshesByPart, materialsByPart };
}

/** Aplica color / variante de material / imagen del store a los materiales reales del glTF. */
function useSyncPartsToMaterials(
  materialsByPart: Map<string, THREE.MeshStandardMaterial[]>,
  parts: PartsSelectionState
) {
  const appliedTexturesRef = useRef(new Map<string, THREE.Texture>());

  useEffect(() => {
    for (const [partId, materials] of materialsByPart) {
      const selection = parts[partId];
      const part = getShoePart(partId);
      if (!selection || !part) continue;

      for (const material of materials) {
        material.color.set(selection.colorHex);

        if (part.supports.material && selection.materialVariantId) {
          const variant = getMaterialVariant(selection.materialVariantId);
          if (variant) {
            material.roughness = variant.roughness;
            material.metalness = variant.metalness;
          }
        }

        if (part.supports.image) {
          const currentTexture = appliedTexturesRef.current.get(partId);
          if (selection.image) {
            if (currentTexture?.userData.dataUrl !== selection.image.dataUrl) {
              currentTexture?.dispose();
              const texture = textureLoader.load(selection.image.dataUrl);
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.userData.dataUrl = selection.image.dataUrl;
              appliedTexturesRef.current.set(partId, texture);
              material.map = texture;
            } else {
              material.map = currentTexture ?? null;
            }
          } else if (currentTexture) {
            currentTexture.dispose();
            appliedTexturesRef.current.delete(partId);
            material.map = null;
          }
        }

        material.needsUpdate = true;
      }
    }
  }, [materialsByPart, parts]);
}

function ShoeModel() {
  const { scene } = useGLTF(SHOE_MODEL_PATH);
  const { meshesByPart, materialsByPart } = useMemo(() => buildPartRegistry(scene), [scene]);

  const parts = useConfiguratorStore((s) => s.parts);
  const selectedPartId = useConfiguratorStore((s) => s.selectedPartId);
  const hoveredPartId = useConfiguratorStore((s) => s.hoveredPartId);
  const selectPart = useConfiguratorStore((s) => s.selectPart);
  const hoverPart = useConfiguratorStore((s) => s.hoverPart);

  useSyncPartsToMaterials(materialsByPart, parts);

  const partIdFromEvent = (event: ThreeEvent<PointerEvent | MouseEvent>): string | null => {
    const material = (event.object as THREE.Mesh).material;
    const name = Array.isArray(material) ? material[0]?.name : material?.name;
    return name ? partIdFromMaterialName(name) : null;
  };

  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const partId = partIdFromEvent(event);
    if (partId) {
      hoverPart(partId);
      document.body.style.cursor = "pointer";
    }
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    hoverPart(null);
    document.body.style.cursor = "auto";
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const partId = partIdFromEvent(event);
    selectPart(partId && partId === selectedPartId ? null : partId);
  };

  const selectedMeshes = selectedPartId ? meshesByPart.get(selectedPartId) ?? [] : [];
  const hoveredMeshes =
    hoveredPartId && hoveredPartId !== selectedPartId ? meshesByPart.get(hoveredPartId) ?? [] : [];

  return (
    <>
      <primitive
        object={scene}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      {(selectedMeshes.length > 0 || hoveredMeshes.length > 0) && (
        // autoClear={false}: con el default (true) el pase de Outline no
        // llega a pantalla en esta combinación de versiones de three/R3F/
        // postprocessing — verificado empíricamente (ver docs/fase3-visor-3d.md).
        // Como contrapartida, desmontamos el EffectComposer entero (no solo
        // bajamos la selección a []) apenas no hay nada para resaltar, así
        // no queda un contorno "fantasma" pegado en el buffer sin limpiar.
        <EffectComposer autoClear={false}>
          {selectedMeshes.length > 0 && (
            <Outline
              selection={selectedMeshes}
              visibleEdgeColor={0x4da3ff}
              hiddenEdgeColor={0x4da3ff}
              edgeStrength={6}
              blur
            />
          )}
          {hoveredMeshes.length > 0 && (
            <Outline
              selection={hoveredMeshes}
              visibleEdgeColor={0xffffff}
              hiddenEdgeColor={0xffffff}
              edgeStrength={2.5}
              blur
            />
          )}
        </EffectComposer>
      )}
    </>
  );
}

/**
 * Registra en captureControllerRef una función que renderiza un frame a
 * mayor resolución (subiendo el pixelRatio del renderer un instante) y lo
 * exporta como PNG — así el botón "Descargar captura" del panel (Fase 5),
 * que vive fuera del árbol de R3F, puede pedir una captura en alta
 * resolución sin acoplar el panel al renderer.
 */
function CaptureController() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    captureControllerRef.current = {
      captureHighRes: (pixelRatio = 3) =>
        new Promise<Blob>((resolve, reject) => {
          const prevPixelRatio = gl.getPixelRatio();
          const prevSize = gl.getSize(new THREE.Vector2());
          // No superar ~4096px de lado para no reventar memoria/GPU en equipos modestos.
          const safeRatio = Math.max(
            1,
            Math.min(pixelRatio, 4096 / prevSize.x, 4096 / prevSize.y)
          );

          gl.setPixelRatio(safeRatio);
          gl.setSize(prevSize.x, prevSize.y, false);
          gl.render(scene, camera);

          gl.domElement.toBlob((blob) => {
            gl.setPixelRatio(prevPixelRatio);
            gl.setSize(prevSize.x, prevSize.y, false);
            gl.render(scene, camera);

            if (blob) resolve(blob);
            else reject(new Error("No se pudo generar la captura"));
          }, "image/png");
        }),
    };
    return () => {
      captureControllerRef.current = null;
    };
  }, [gl, scene, camera]);

  return null;
}

export function ShoeCanvas() {
  return (
    <Canvas
      camera={{ position: [0.6, 0.4, 0.9], fov: 35 }}
      shadows
      gl={{ preserveDrawingBuffer: true }}
      onPointerMissed={() => useConfiguratorStore.getState().selectPart(null)}
    >
      <Suspense fallback={null}>
        <ShoeModel />
      </Suspense>
      <CaptureController />
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
