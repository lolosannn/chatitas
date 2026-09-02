import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

const outDir = "/tmp/claude-0/-home-user-chatitas/c1d4d6ea-1b4c-5f14-a8e0-aa02ae28b24d/scratchpad";
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/real-model-final.png` });

await browser.close();
console.log("done");
