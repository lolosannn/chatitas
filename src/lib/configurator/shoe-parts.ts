/**
 * Definición canónica de las partes configurables del zapato (chata/ballerina).
 *
 * Convención del modelo 3D: cada parte configurable corresponde a UN material
 * compartido, nombrado `mat_<id>`, aplicado a uno o más meshes/primitivas del
 * glTF. No importa cuántas formen la parte — todas comparten la misma
 * instancia de material, así que pintar/texturizar la parte es una sola
 * actualización de material.
 *
 * Esta misma convención es la que debe respetar el modelo definitivo que
 * haga el modelador 3D (ver docs/fase1-modelo-3d.md).
 *
 * Estado actual (v4): modelo generado con IA y segmentado a mano en
 * Blender (separación real por selección de caras, no una heurística por
 * posición). Trae 4 partes limpias: Cuerpo, Talonera, Ribete y Suela —
 * todavía no hay Puntera separada en este corte, ni UVs (por eso `image`
 * sigue en `false` en todas). Se agrandan apenas el modelo las traiga.
 */

export type ShoePartCategory = "upper" | "accent" | "sole";

export interface ShoePartDefinition {
  /** Coincide con el sufijo del material en el glTF: `mat_<id>`. */
  id: string;
  label: string;
  category: ShoePartCategory;
  supports: {
    color: boolean;
    /** Imagen/logo subido por el usuario, aplicado como texture map. */
    image: boolean;
    /** Variantes de material físico (cuero, gamuza, malla, charol). */
    material: boolean;
  };
}

export const SHOE_PARTS: ShoePartDefinition[] = [
  {
    id: "upper_body",
    label: "Cuerpo",
    category: "upper",
    supports: { color: true, image: false, material: true },
  },
  {
    id: "upper_heel_counter",
    label: "Talonera",
    category: "upper",
    supports: { color: true, image: false, material: true },
  },
  {
    id: "trim",
    label: "Ribete",
    category: "accent",
    supports: { color: true, image: false, material: false },
  },
  {
    id: "sole_outsole",
    label: "Suela",
    category: "sole",
    supports: { color: true, image: false, material: false },
  },
];

export function materialNameForPart(partId: string): string {
  return `mat_${partId}`;
}

/** Inversa de materialNameForPart — null si el nombre no sigue la convención. */
export function partIdFromMaterialName(materialName: string): string | null {
  return materialName.startsWith("mat_") ? materialName.slice(4) : null;
}

export function getShoePart(partId: string): ShoePartDefinition | undefined {
  return SHOE_PARTS.find((part) => part.id === partId);
}
