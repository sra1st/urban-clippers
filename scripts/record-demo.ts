// Records a phone-sized walkthrough of the booking flow for your Upwork portfolio.
// Run from the project folder:
//   First time only:   npx playwright install chromium
//   Local site:        npm run record
//   Live site:         BASE_URL=https://your-site.netlify.app npm run record
// Output: recordings/urban-clippers-demo.webm (about 35 seconds). See README for the GIF/MP4 commands.
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = join(process.cwd(), "recordings");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  rmSync(join(OUT_DIR, "tmp"), { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, "tmp"), { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // Video size must equal the viewport, or the page fills only part of the frame.
    recordVideo: { dir: join(OUT_DIR, "tmp"), size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();

  // 1. Home
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await pause(2500);
  await page.mouse.wheel(0, 900);
  await pause(1800);
  await page.mouse.wheel(0, -900);
  await pause(800);

  // 2. Services
  await page.getByRole("link", { name: "Book your slot" }).first().click();
  await page.waitForURL("**/book");
  await pause(1500);
  await page.getByText("Classic haircut").first().click();
  await pause(700);
  await page.getByText("Hot towel shave").first().click();
  await pause(1200);
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. Date and time
  await page.getByRole("heading", { level: 2 }).filter({ hasText: /time|when/i }).first().waitFor();
  await pause(1800);
  const chips = page.getByRole("button", { name: /^\d{1,2}:00 (AM|PM)$/ });
  await chips.first().waitFor();
  const count = await chips.count();
  for (let i = 0; i < count; i++) {
    const chip = chips.nth(i);
    if (await chip.isEnabled()) {
      await chip.click();
      break;
    }
  }
  await pause(1500);
  await page.getByRole("button", { name: "Continue" }).click();

  // 4. Details
  await page.locator("#name").waitFor();
  await pause(600);
  await page.locator("#name").pressSequentially("Rafi Ahmed", { delay: 70 });
  await page.locator("#phone").pressSequentially("01712345678", { delay: 60 });
  await pause(1000);
  await page.getByRole("button", { name: "Continue" }).click();

  // 5. Review and confirm
  await pause(2000);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.waitForURL("**/booking/**", { timeout: 20000 });
  await pause(6500);

  // 6. Admin side (demo account)
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await pause(1200);
  await page.getByRole("button", { name: /demo admin/i }).first().click();
  await page.waitForURL("**/admin**", { timeout: 20000 });
  await pause(4000);
  await page.mouse.wheel(0, 500);
  await pause(3500);

  const video = page.video();
  await ctx.close();
  await browser.close();
  if (video) {
    const dest = join(OUT_DIR, "urban-clippers-demo.webm");
    renameSync(await video.path(), dest);
    rmSync(join(OUT_DIR, "tmp"), { recursive: true, force: true });
    console.log("Saved", dest);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
