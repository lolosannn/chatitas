import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const outDir = "/tmp/claude-0/-home-user-chatitas/c1d4d6ea-1b4c-5f14-a8e0-aa02ae28b24d/scratchpad";

// Hover sobre el cuerpo/capellada — debería mostrar outline blanco.
await page.mouse.move(400, 180, { steps: 10 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/interaction-hover.png` });

// Click para seleccionar — outline azul.
await page.mouse.click(400, 180);
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/interaction-selected.png` });

// Mover y clickear en un punto vacío — sin outline.
await page.mouse.move(800, 600, { steps: 20 });
await page.mouse.click(800, 600);
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/interaction-deselected.png` });

await browser.close();
console.log("done");
