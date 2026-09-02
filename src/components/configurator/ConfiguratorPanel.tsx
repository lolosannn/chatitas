"use client";

import { useRef, useState } from "react";
import {
  SHOE_PARTS,
  type ShoePartCategory,
  type ShoePartDefinition,
} from "@/lib/configurator/shoe-parts";
import { COLOR_PALETTE } from "@/lib/configurator/color-palette";
import { MATERIAL_VARIANTS } from "@/lib/configurator/material-variants";
import { useConfiguratorStore } from "@/lib/configurator/store";
import { readFileAsDataUrl } from "@/lib/read-file-as-data-url";
import { captureControllerRef } from "@/lib/configurator/capture";
import { buildOrderSummary } from "@/lib/configurator/order-summary";
import { downloadBlob } from "@/lib/download-blob";

const CATEGORY_LABELS: Record<ShoePartCategory, string> = {
  upper: "Cuerpo",
  accent: "Detalles",
};

const CATEGORY_ORDER: ShoePartCategory[] = ["upper", "accent"];

export function ConfiguratorPanel() {
  const resetAll = useConfiguratorStore((s) => s.resetAll);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900 text-neutral-100">
      <div className="border-b border-neutral-800 px-4 py-4">
        <h1 className="text-lg font-semibold">Configurador de zapatos 3D</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Elegí una parte del zapato (acá o directamente en el modelo) para
          personalizarla.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {CATEGORY_ORDER.map((category) => {
          const parts = SHOE_PARTS.filter((part) => part.category === category);
          if (parts.length === 0) return null;
          return (
            <section key={category} className="mb-4">
              <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="flex flex-col gap-1">
                {parts.map((part) => (
                  <PartRow key={part.id} part={part} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <ExportControls />
      <div className="border-t border-neutral-800 p-3">
        <button
          type="button"
          onClick={resetAll}
          className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Restablecer todo
        </button>
      </div>
    </aside>
  );
}

function ExportControls() {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleDownloadCapture = async () => {
    const controller = captureControllerRef.current;
    if (!controller || isCapturing) return;
    setIsCapturing(true);
    try {
      const blob = await controller.captureHighRes(3);
      downloadBlob(blob, `zapato-personalizado-${Date.now()}.png`);
    } catch (error) {
      console.error("No se pudo generar la captura", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadSummary = () => {
    const summary = buildOrderSummary(useConfiguratorStore.getState().parts);
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `pedido-zapato-${Date.now()}.json`);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-800 p-3">
      <button
        type="button"
        onClick={handleDownloadCapture}
        disabled={isCapturing}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCapturing ? "Generando captura…" : "Descargar captura (PNG)"}
      </button>
      <button
        type="button"
        onClick={handleDownloadSummary}
        className="w-full rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
      >
        Descargar resumen del pedido (JSON)
      </button>
    </div>
  );
}

function PartRow({ part }: { part: ShoePartDefinition }) {
  const selection = useConfiguratorStore((s) => s.parts[part.id]);
  const isSelected = useConfiguratorStore((s) => s.selectedPartId === part.id);
  const selectPart = useConfiguratorStore((s) => s.selectPart);
  const hoverPart = useConfiguratorStore((s) => s.hoverPart);
  const setPartColor = useConfiguratorStore((s) => s.setPartColor);
  const setPartMaterial = useConfiguratorStore((s) => s.setPartMaterial);
  const setPartImage = useConfiguratorStore((s) => s.setPartImage);
  const resetPart = useConfiguratorStore((s) => s.resetPart);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selection) return null;

  const toggle = () => selectPart(isSelected ? null : part.id);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPartImage(part.id, { dataUrl, fileName: file.name });
  };

  return (
    <div
      className={`rounded-md border ${isSelected ? "border-sky-500 bg-neutral-800" : "border-transparent bg-neutral-800/40"}`}
      onMouseEnter={() => hoverPart(part.id)}
      onMouseLeave={() => hoverPart(null)}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-neutral-600"
          style={{ backgroundColor: selection.colorHex }}
        />
        <span className="flex-1 text-sm">{part.label}</span>
        <span className="text-xs text-neutral-500">{isSelected ? "▲" : "▼"}</span>
      </button>

      {isSelected && (
        <div className="space-y-3 px-3 pb-3">
          <div>
            <p className="mb-1.5 text-xs text-neutral-400">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  title={swatch.label}
                  onClick={() => setPartColor(part.id, swatch.hex)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    selection.colorHex.toLowerCase() === swatch.hex.toLowerCase()
                      ? "border-sky-400"
                      : "border-neutral-700"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
            </div>
          </div>

          {part.supports.material && (
            <div>
              <p className="mb-1.5 text-xs text-neutral-400">Material</p>
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_VARIANTS.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setPartMaterial(part.id, variant.id)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      selection.materialVariantId === variant.id
                        ? "border-sky-400 bg-neutral-700 text-white"
                        : "border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {part.supports.image && (
            <div>
              <p className="mb-1.5 text-xs text-neutral-400">Imagen / logo</p>
              {selection.image ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL en memoria, no un asset optimizable por next/image */}
                  <img
                    src={selection.image.dataUrl}
                    alt={selection.image.fileName}
                    className="h-10 w-10 rounded border border-neutral-700 object-cover"
                  />
                  <span className="flex-1 truncate text-xs text-neutral-400">
                    {selection.image.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPartImage(part.id, null)}
                    className="text-xs text-neutral-400 underline hover:text-neutral-200"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-md border border-dashed border-neutral-700 px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-700"
                >
                  Subir imagen
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => resetPart(part.id)}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            Restablecer parte
          </button>
        </div>
      )}
    </div>
  );
}
