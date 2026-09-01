import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// PNG 4x4 rojo/azul en damero, generado una vez y embebido en base64 para
// no depender de herramientas externas (python, imagemagick) en este script.
const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAGklEQVR4nGO4Y2RkFHUHQjLAWXeMjBhwygAAKNIVQRBB1NkAAAAASUVORK5CYII=";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

const outDir = "/tmp/claude-0/-home-user-chatitas/c1d4d6ea-1b4c-5f14-a8e0-aa02ae28b24d/scratchpad";
const testImagePath = path.join(os.tmpdir(), "test-logo.png");
fs.writeFileSync(testImagePath, Buffer.from(TEST_IMAGE_BASE64, "base64"));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// Seleccionar y personalizar el cuerpo/capellada
await page.getByText("Cuerpo / capellada", { exact: true }).click();
await page.waitForTimeout(400);
await page.getByTitle("Rojo").click();
await page.waitForTimeout(400);
await page.getByText("Gamuza", { exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/panel-color-material.png` });

// Cambiar al parche/logo lateral y subir una imagen
await page.getByText("Parche / logo lateral", { exact: true }).click();
await page.waitForTimeout(400);
await page.locator('input[type="file"]').setInputFiles(testImagePath);
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/panel-image-uploaded.png` });

// Quitar la imagen
await page.getByText("Quitar", { exact: true }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/panel-image-removed.png` });

fs.rmSync(testImagePath, { force: true });
await browser.close();
console.log("done");
