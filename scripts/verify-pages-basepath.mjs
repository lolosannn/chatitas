import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

const requests = [];
page.on("requestfinished", (req) => {
  requests.push(req.url());
});
const failedRequests = [];
page.on("requestfailed", (req) => {
  failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`);
});
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => {
  consoleErrors.push(`pageerror: ${err.message}`);
});

await page.goto("http://localhost:8080/chatitas/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/claude-0/-home-user-chatitas/c1d4d6ea-1b4c-5f14-a8e0-aa02ae28b24d/scratchpad/pages-basepath.png" });

console.log("=== glb requests ===");
console.log(requests.filter((u) => u.includes(".glb")));
console.log("=== failed requests ===");
console.log(failedRequests);
console.log("=== console errors ===");
console.log(consoleErrors);

await browser.close();
