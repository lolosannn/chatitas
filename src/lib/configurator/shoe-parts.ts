/**
 * Definición canónica de las partes configurables del zapato (chata/ballerina).
 *
 * Convención del modelo 3D: cada parte configurable corresponde a UN material
 * compartido, nombrado `mat_<id>`, aplicado a uno o más meshes del glTF. No
 * importa cuántos nodos/mallas formen la parte — todas comparten la misma
 * instancia de material, así que pintar/texturizar la parte es una sola
 * actualización de material.
 *
 * Esta misma convención es la que debe respetar el modelo definitivo que
 * haga el modelador 3D (ver docs/fase1-modelo-3d.md).
 */

export type ShoePartCategory = "sole" | "upper" | "accent";

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
    id: "sole_outsole",
    label: "Suela",
    category: "sole",
    supports: { color: true, image: false, material: true },
  },
  {
    id: "heel_taco",
    label: "Taco",
    category: "sole",
    supports: { color: true, image: false, material: false },
  },
  {
    id: "upper_body",
    label: "Cuerpo",
    category: "upper",
    supports: { color: true, image: true, material: true },
  },
  {
    id: "upper_toe_cap",
    label: "Puntera",
    category: "upper",
    supports: { color: true, image: true, material: true },
  },
  {
    id: "upper_heel_counter",
    label: "Talonera",
    category: "upper",
    supports: { color: true, image: true, material: true },
  },
  {
    id: "trim",
    label: "Ribete",
    category: "accent",
    supports: { color: true, image: false, material: false },
  },
  {
    id: "strap",
    label: "Pulsera",
    category: "accent",
    supports: { color: true, image: false, material: true },
  },
  {
    id: "applique",
    label: "Aplique",
    category: "accent",
    supports: { color: true, image: true, material: false },
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
