import { chromium } from "playwright";
import fs from "node:fs";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const outDir = "/tmp/claude-0/-home-user-chatitas/c1d4d6ea-1b4c-5f14-a8e0-aa02ae28b24d/scratchpad";

// Personalizar un poco antes de exportar, para que el resumen no esté vacío
await page.getByText("Cuerpo / capellada", { exact: true }).click();
await page.waitForTimeout(300);
await page.getByTitle("Rojo").click();
await page.waitForTimeout(300);

// Descargar la captura PNG
const [download1] = await Promise.all([
  page.waitForEvent("download"),
  page.getByText("Descargar captura (PNG)", { exact: true }).click(),
]);
const pngPath = `${outDir}/export-capture.png`;
await download1.saveAs(pngPath);
console.log("PNG guardado:", pngPath, "tamaño:", fs.statSync(pngPath).size, "bytes");

// Descargar el resumen JSON
const [download2] = await Promise.all([
  page.waitForEvent("download"),
  page.getByText("Descargar resumen del pedido (JSON)", { exact: true }).click(),
]);
const jsonPath = `${outDir}/export-summary.json`;
await download2.saveAs(jsonPath);
const summary = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
console.log("JSON guardado:", jsonPath);
console.log(
  "upper_body en el resumen:",
  JSON.stringify(summary.parts.find((p) => p.partId === "upper_body"))
);

await browser.close();
console.log("done");
