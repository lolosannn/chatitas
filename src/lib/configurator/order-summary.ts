import { SHOE_PARTS } from "./shoe-parts";
import { COLOR_PALETTE } from "./color-palette";
import { getMaterialVariant } from "./material-variants";
import type { PartsSelectionState } from "./store";

export interface OrderPartSummary {
  partId: string;
  label: string;
  colorHex: string;
  /** Nombre de la paleta curada, si el color activo coincide con un swatch conocido. */
  colorLabel: string | null;
  materialVariantId: string | null;
  materialLabel: string | null;
  hasImage: boolean;
  imageFileName: string | null;
}

export interface OrderSummary {
  generatedAt: string;
  parts: OrderPartSummary[];
}

export function buildOrderSummary(parts: PartsSelectionState): OrderSummary {
  return {
    generatedAt: new Date().toISOString(),
    parts: SHOE_PARTS.map((part) => {
      const selection = parts[part.id];
      const swatch = COLOR_PALETTE.find(
        (c) => c.hex.toLowerCase() === selection.colorHex.toLowerCase()
      );
      const variant = selection.materialVariantId
        ? getMaterialVariant(selection.materialVariantId)
        : undefined;

      return {
        partId: part.id,
        label: part.label,
        colorHex: selection.colorHex,
        colorLabel: swatch?.label ?? null,
        materialVariantId: selection.materialVariantId,
        materialLabel: variant?.label ?? null,
        hasImage: selection.image !== null,
        imageFileName: selection.image?.fileName ?? null,
      };
    }),
  };
}
