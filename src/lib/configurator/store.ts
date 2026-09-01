import { create } from "zustand";
import { SHOE_PARTS, type ShoePartDefinition } from "./shoe-parts";
import { getColorSwatch, DEFAULT_COLOR_ID } from "./color-palette";
import { DEFAULT_MATERIAL_VARIANT_ID } from "./material-variants";

export interface PartImageSelection {
  /** Imagen subida por el usuario, en memoria (ver Fase 1: sin backend). */
  dataUrl: string;
  fileName: string;
}

export interface PartSelection {
  colorHex: string;
  /** null si la parte no soporta variantes de material (supports.material: false). */
  materialVariantId: string | null;
  /** null si la parte no soporta imagen, o si soporta pero no hay ninguna cargada. */
  image: PartImageSelection | null;
}

export type PartsSelectionState = Record<string, PartSelection>;

/**
 * Color por defecto para partes que no deberían arrancar en el blanco
 * genérico (suela y herrajes) — sin esto, el primer render del visor
 * (Fase 3) pinta todas las partes del mismo blanco y el zapato pierde toda
 * lectura de forma.
 */
const DEFAULT_COLOR_ID_BY_PART: Record<string, string> = {
  sole_outsole: "black",
  heel_taco: "black",
  trim: "black",
  applique: "silver",
};

function createDefaultSelection(part: ShoePartDefinition): PartSelection {
  const colorId = DEFAULT_COLOR_ID_BY_PART[part.id] ?? DEFAULT_COLOR_ID;
  return {
    colorHex: getColorSwatch(colorId)?.hex ?? "#ffffff",
    materialVariantId: part.supports.material ? DEFAULT_MATERIAL_VARIANT_ID : null,
    image: null,
  };
}

function createDefaultPartsState(): PartsSelectionState {
  return Object.fromEntries(
    SHOE_PARTS.map((part) => [part.id, createDefaultSelection(part)])
  );
}

interface ConfiguratorState {
  /** Selección actual por part_id — ver src/lib/configurator/shoe-parts.ts. */
  parts: PartsSelectionState;
  /** Parte elegida por el usuario en el panel/visor (Fase 3/4). */
  selectedPartId: string | null;
  /** Parte bajo el cursor en el visor, para hover/outline (Fase 3). */
  hoveredPartId: string | null;

  setPartColor: (partId: string, colorHex: string) => void;
  setPartMaterial: (partId: string, materialVariantId: string | null) => void;
  setPartImage: (partId: string, image: PartImageSelection | null) => void;
  resetPart: (partId: string) => void;
  resetAll: () => void;
  selectPart: (partId: string | null) => void;
  hoverPart: (partId: string | null) => void;
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  parts: createDefaultPartsState(),
  selectedPartId: null,
  hoveredPartId: null,

  setPartColor: (partId, colorHex) =>
    set((state) => ({
      parts: {
        ...state.parts,
        [partId]: { ...state.parts[partId], colorHex },
      },
    })),

  setPartMaterial: (partId, materialVariantId) =>
    set((state) => ({
      parts: {
        ...state.parts,
        [partId]: { ...state.parts[partId], materialVariantId },
      },
    })),

  setPartImage: (partId, image) =>
    set((state) => ({
      parts: {
        ...state.parts,
        [partId]: { ...state.parts[partId], image },
      },
    })),

  resetPart: (partId) =>
    set((state) => {
      const part = SHOE_PARTS.find((p) => p.id === partId);
      if (!part) return state;
      return {
        parts: { ...state.parts, [partId]: createDefaultSelection(part) },
      };
    }),

  resetAll: () => set({ parts: createDefaultPartsState() }),

  selectPart: (partId) => set({ selectedPartId: partId }),
  hoverPart: (partId) => set({ hoveredPartId: partId }),
}));
