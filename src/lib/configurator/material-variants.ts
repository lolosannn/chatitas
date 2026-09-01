export interface MaterialVariant {
  id: string;
  label: string;
  /** Aplicados directamente a MeshStandardMaterial en la Fase 3. */
  roughness: number;
  metalness: number;
}

/**
 * Catálogo v1 de materiales físicos seleccionables, para las partes que
 * declaran `supports.material: true` en shoe-parts.ts.
 */
export const MATERIAL_VARIANTS: MaterialVariant[] = [
  { id: "leather", label: "Cuero", roughness: 0.55, metalness: 0.05 },
  { id: "suede", label: "Gamuza", roughness: 0.95, metalness: 0 },
  { id: "mesh", label: "Malla", roughness: 0.8, metalness: 0 },
  { id: "patent", label: "Charol", roughness: 0.15, metalness: 0.1 },
];

export const DEFAULT_MATERIAL_VARIANT_ID = "leather";

export function getMaterialVariant(id: string): MaterialVariant | undefined {
  return MATERIAL_VARIANTS.find((m) => m.id === id);
}
