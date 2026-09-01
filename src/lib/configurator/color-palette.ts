export interface ColorSwatch {
  id: string;
  label: string;
  hex: string;
}

/**
 * Paleta curada v1 — se puede ampliar/reemplazar por la diseñadora sin
 * tocar el resto del configurador (Fase 4 solo itera esta lista).
 */
export const COLOR_PALETTE: ColorSwatch[] = [
  { id: "white", label: "Blanco", hex: "#f5f5f5" },
  { id: "black", label: "Negro", hex: "#111111" },
  { id: "stone", label: "Piedra", hex: "#c9c2b4" },
  { id: "cream", label: "Crema", hex: "#efe6d8" },
  { id: "red", label: "Rojo", hex: "#c0392b" },
  { id: "burgundy", label: "Bordó", hex: "#6e2334" },
  { id: "orange", label: "Naranja", hex: "#e07a2c" },
  { id: "mustard", label: "Mostaza", hex: "#c99a2e" },
  { id: "olive", label: "Oliva", hex: "#5b6b3a" },
  { id: "forest", label: "Verde bosque", hex: "#2d5a3d" },
  { id: "teal", label: "Verde azulado", hex: "#2b6e6e" },
  { id: "sky", label: "Celeste", hex: "#5b93c9" },
  { id: "navy", label: "Azul marino", hex: "#1f3a5f" },
  { id: "purple", label: "Violeta", hex: "#5a3d7a" },
  { id: "pink", label: "Rosa", hex: "#d97ba0" },
  { id: "silver", label: "Plata", hex: "#b0b0b0" },
];

export const DEFAULT_COLOR_ID = "white";

export function getColorSwatch(id: string): ColorSwatch | undefined {
  return COLOR_PALETTE.find((c) => c.id === id);
}
