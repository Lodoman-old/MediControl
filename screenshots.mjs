import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const OUT = "screenshots";

const PAGES = [
  { path: "/login", name: "01_login" },
  { path: "/agenda", name: "02_agenda" },
  { path: "/dashboard", name: "03_dashboard" },
  { path: "/expediente", name: "04_patient_list" },
  { path: "/expediente/542b60a3-e170-4786-92f1-2bb7c20a1f07", name: "05_expediente" },
  { path: "/expediente/542b60a3-e170-4786-92f1-2bb7c20a1f07/history", name: "06_medical_history" },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/01_login.png`, fullPage: false });

  await page.fill("#email", "doctor@medicontrol.mx");
  await page.fill("#password", "Doctor123!Demo");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  for (const s of PAGES) {
    if (s.path === "/login") continue;
    try {
      await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: true });
      console.log(`OK: ${s.name}`);
    } catch (e) {
      console.error(`FAIL: ${s.name} - ${e.message}`);
    }
  }

  await browser.close();
}

run().catch(console.error);
