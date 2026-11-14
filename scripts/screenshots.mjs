import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/workspace/hfc-clone-shots";
const only = process.argv.slice(2);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE", m.text().slice(0, 200)));

async function shot(name, full = true) {
  if (only.length && !only.some((o) => name.includes(o))) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log("saved", name);
}
async function loginAs(email) {
  await ctx.clearCookies();
  await page.goto(BASE + "/");
  await page.selectOption("#dev-email", email);
  await Promise.all([page.waitForURL("**/app**"), page.click("form button:has-text(\"Sign in\")")]);
}

await page.goto(BASE + "/");
await shot("00-landing", false);

await loginAs("admin@hfc.example");
await page.goto(BASE + "/app");
await shot("01-today", false);
await page.click('button[aria-label="Change delivery date"]');
await shot("02-delivery-date-calendar", false);
await page.keyboard.press("Escape");
await page.goto(BASE + "/app?date=" + new Date(Date.now() + 6 * 3600e3 + 86400e3).toISOString().slice(0, 10));
await shot("02b-today-preorder-tomorrow");
await page.goto(BASE + "/app/orders");
await shot("03-history");
await page.goto(BASE + "/app/profile");
await shot("04-profile", false);
await page.goto(BASE + "/admin");
await shot("05-admin-overview");
await page.goto(BASE + "/admin/menu");
await shot("06-admin-menu");
await page.click("text=Add option >> nth=0").catch(() => {});
await shot("07-admin-menu-add-option");
await page.click("text=Show archived");
await shot("08-admin-menu-saved-archived");
await page.goto(BASE + "/admin/orders");
await shot("09-admin-orders");
await page.click("text=Order for member >> nth=-1").catch(() => {});
await page.waitForTimeout(800);
await shot("10-admin-order-for-member-form");
await page.goto(BASE + "/admin/users");
await shot("11-admin-users");
await page.click('button[aria-label="Deposit to wallet"] >> nth=0');
await shot("11b-admin-users-deposit-form", false);
await page.goto(BASE + "/admin/users?q=Imran");
await page.waitForTimeout(500);
await page.click("main a[href^=\"/admin/users/\"]:has-text(\"Imran\")");
await page.waitForURL("**/admin/users/**");
await shot("14-admin-member-account");
await page.click('button[aria-label="Edit phone"]');
await shot("15-admin-edit-phone-modal", false);
await page.keyboard.press("Escape");
await page.click('button[aria-label="Edit balance"]');
await shot("16-admin-edit-balance-modal", false);
await page.keyboard.press("Escape");
await page.goto(BASE + "/admin/team");
await shot("12-admin-staff-offices");
await page.click("text=Add managers >> nth=0");
await shot("13-admin-managers-modal", false);

await browser.close();
