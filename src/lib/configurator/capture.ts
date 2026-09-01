/**
 * Puente entre el <Canvas> de R3F (donde vive el renderer de three.js) y el
 * botón de exportación del panel (fuera del árbol de R3F): el propio
 * ShoeCanvas registra acá su función de captura al montar.
 */
export interface CaptureController {
  captureHighRes: (pixelRatio?: number) => Promise<Blob>;
}

export const captureControllerRef: { current: CaptureController | null } = {
  current: null,
};
