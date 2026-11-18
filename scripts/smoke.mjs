/**
 * End-to-end smoke test (Playwright, headless). Needs: a running app (npm run dev / start),
 * a seeded DB (npm run db:reset) and ENABLE_DEV_LOGIN=true.
 *
 *   npx playwright install chromium
 *   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
 */
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DATABASE_URL?.split("?")[0] ?? "postgresql://hfc:hfc_dev_password@localhost:5432/hfc";
const q = (sql) => execFileSync("psql", [DB, "-At", "-c", sql], { encoding: "utf8" }).trim();
const tomorrow = new Date(Date.now() + 6 * 3600e3 + 86400e3).toISOString().slice(0, 10);

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + extra}`);
  if (!ok) failed++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);

async function loginAs(email) {
  await ctx.clearCookies();
  await page.goto(BASE + "/");
  await page.selectOption("#dev-email", email);
  await page.click('form button:has-text("Sign in")');
  await page.waitForLoadState("networkidle");
}
const toast = async (text) => page.waitForSelector(`[data-sonner-toast]:has-text("${text}")`, { timeout: 10000 }).then(() => true, () => false);

// ---------------------------------------------------------------- member flows
await loginAs("admin@hfc.example");
check("super admin lands on /app", page.url().endsWith("/app"));
await page.goto(`${BASE}/app?date=${tomorrow}`);
await page.click('button[aria-label="Add Rui Fish Curry"]');
await page.click('button[aria-label="Increase"]');
await page.click('button:has-text("Place order")');
check("member places order (toast)", await toast("Order placed"));
const order = q(`select i.title||'|'||i.quantity||'|'||o.amount||'|'||o.status from "Order" o join "OrderItem" i on i."orderId"=o.id join "User" u on u.id=o."userId" where u.email='admin@hfc.example' and o."mealDate"='${tomorrow}' and o.status<>'CANCELLED'`);
check("order persisted (qty 2 ×130, one Order with items)", order === "Rui Fish Curry|2|260|PENDING", order);
await page.click('button:has-text("Cancel") >> nth=0');
check("member cancels order", await toast("Order cancelled"));
check("order is CANCELLED in DB", q(`select count(*) from "Order" where status='CANCELLED' and "mealDate"='${tomorrow}'`) === "1");

await page.goto(BASE + "/app/profile");
await page.fill("#desk", "Mac 2014 B");
await page.click('button:has-text("Save changes")');
check("profile saved", await toast("Profile saved"));
check("profile persisted", q(`select desk from "User" where email='admin@hfc.example'`) === "Mac 2014 B");

// ---------------------------------------------------------------- admin: distribution
await page.goto(BASE + "/admin/orders");
const before = q(`select balance from "User" where name='Hasan Mahmud'`);
const card = page.locator("li", { hasText: "Hasan Mahmud" }).first();
await card.locator('button:has-text("Mark delivered")').click();
check("mark delivered (no charge — delivery ≠ payment)", await toast("Delivered"));
const after = q(`select balance from "User" where name='Hasan Mahmud'`);
check("delivery does not move balance (billed at order time)", Number(before) === Number(after), `${before} → ${after}`);
check("payment still UNPAID after delivery", q(`select "paymentStatus" from "Order" o join "User" u on u.id=o."userId" where u.name='Hasan Mahmud' and o."mealDate"=to_char((now() at time zone 'Asia/Dhaka')::date,'YYYY-MM-DD')`) === "UNPAID");
await page.click('button:has-text("Delivered")');
const deliveredCard = page.locator("li", { hasText: "Hasan Mahmud" }).first();
await deliveredCard.locator('button:has-text("Wallet charge")').click();
check("wallet charge action", await toast("Wallet charged"));
check("payment status WALLET_CHARGED", q(`select "paymentStatus" from "Order" o join "User" u on u.id=o."userId" where u.name='Hasan Mahmud' and o."mealDate"=to_char((now() at time zone 'Asia/Dhaka')::date,'YYYY-MM-DD')`) === "WALLET_CHARGED");
check("wallet charge moves no money (no deposit, bill already counted)", q(`select balance from "User" where name='Hasan Mahmud'`) === after);

const shamimBefore = Number(q(`select balance from "User" where name='Shamim Hossain'`));
const cashCard = page.locator("li", { hasText: "Shamim Hossain" }).first();
await cashCard.locator('button:has-text("Cash paid")').click();
check("cash paid (any member)", await toast("cash paid"));
check("cash paid → CASH_PAYMENT ledger + balance up by order amount", q(`select count(*) from "LedgerEntry" l join "User" u on u.id=l."userId" where u.name='Shamim Hossain' and l.type='CASH_PAYMENT'`) === "1" && Number(q(`select balance from "User" where name='Shamim Hossain'`)) > shamimBefore);

// phone order
await page.click("text=Order for member >> nth=-1");
await page.selectOption("#po-office", { label: "Ambon Complex" });
await page.fill("#po-date", tomorrow);
await page.fill("#po-member", "Samira");
await page.click('li button:has-text("Samira Islam")');
await page.waitForFunction(() => document.querySelectorAll("#po-meal option").length > 2);
await page.selectOption("#po-meal", { index: 1 });
await page.click('button:has-text("Add another meal")');
await page.click('button:has-text("Place order for member")');
check("phone order placed", await toast("Order placed for Samira"));
check("phone order has placed_by + note + items", q(`select count(*) from "Order" o join "User" u on u.id=o."userId" where u.name='Samira Islam' and o.note='Phone Order' and o."placedById" is not null and o."mealDate"='${tomorrow}' and exists (select 1 from "OrderItem" i where i."orderId"=o.id)`) === "1");

// ---------------------------------------------------------------- admin: users
await page.goto(BASE + "/admin/users?q=Parvez");
await page.waitForSelector("text=Parvez Ahmed");
const pBefore = Number(q(`select balance from "User" where name='Parvez Ahmed'`));
await page.click('button[aria-label="Deposit to wallet"]');
await page.fill('input[type="number"]', "250");
await page.fill('input[placeholder="Cash received"]', "Test deposit");
await page.click('button:has-text("Record")');
check("deposit recorded", await toast("Recorded"));
check("balance +250 and ledger row", Number(q(`select balance from "User" where name='Parvez Ahmed'`)) === pBefore + 250 && q(`select count(*) from "LedgerEntry" where note='Test deposit'`) === "1");
await page.click('button[aria-label="Switch to One-time"]');
check("switch to one-time", await toast("Switched to One-time"));
await page.selectOption('select[aria-label^="Assign zone"]', { label: "Others" });
check("zone assigned", await toast("Zone updated"));
check("zone persisted", q(`select o.name from "User" u join "Office" o on o.id=u."zoneId" where u.name='Parvez Ahmed'`) === "Others");

// member detail: phone + balance
await page.goto(BASE + "/admin/users?q=Alo");
await page.click('main a[href^="/admin/users/"]:has-text("Alo Uddin")');
await page.click('button[aria-label="Edit phone"]');
await page.fill("#edit-phone", "01811112222");
await page.click('button:has-text("Save phone")');
check("edit phone", await toast("Phone updated"));
await page.click('button[aria-label="Edit balance"]');
await page.fill("#edit-balance", "777");
await page.click('button:has-text("Save balance")');
check("edit balance", await toast("Balance updated"));
check("balance + adjustment ledger", q(`select balance from "User" where name='Alo Uddin'`) === "777" && q(`select count(*) from "LedgerEntry" l join "User" u on u.id=l."userId" where u.name='Alo Uddin' and l.type='ADJUSTMENT' and l.amount=777`) === "1");

// delete an order from member history (admin)
await page.goto(BASE + "/admin/users?q=Wasim");
await page.click('main a[href^="/admin/users/"]:has-text("Wasim Ali")');
await page.click('button:has-text("Delete") >> nth=0');
await page.click('div[role="dialog"] button:has-text("Delete")');
check("admin deletes order", await toast("Order deleted"));

// ban + delete member
await page.goto(BASE + "/admin/users?q=Jihadul");
await page.click('button[aria-label="Ban member"]');
await page.click('div[role="dialog"] button:has-text("Ban member")');
check("ban member", await toast("Member banned"));
await ctx.clearCookies();
await page.goto(BASE + "/");
const devOptions = await page.locator("#dev-email option").allTextContents();
check("banned user no longer offered by dev login", !devOptions.some((o) => o.includes("Jihadul")));
await loginAs("admin@hfc.example");
await page.goto(BASE + "/admin/users?q=Jihadul");
await page.click('button[aria-label="Delete Jihadul Islam"]');
await page.click('div[role="dialog"] button:has-text("Delete member")');
check("delete member", await toast("Member deleted"));

// ---------------------------------------------------------------- admin: menu
await page.goto(BASE + "/admin/menu");
await page.click("text=Add option >> nth=2"); // Monday lunch
await page.fill("#of-title", "Smoke Test Meal");
await page.fill("#of-price", "155");
await page.click('button:has-text("Add to all locations")');
check("add weekly option to all offices", await toast("Option added"));
check("4 offices got it + saved meal kept", q(`select count(*) from "MenuOption" where title='Smoke Test Meal'`) === "4" && q(`select count(*) from "SavedMeal" where title='Smoke Test Meal' and not archived`) === "1");
await page.click('button:has-text("Smoke Test Meal")');
await page.fill("#of-price", "165");
await page.click('button:has-text("Update option")');
check("update option", await toast("Option updated"));
check("price updated everywhere", q(`select count(*) from "MenuOption" where title='Smoke Test Meal' and price=165`) === "4");
await page.click('button:has-text("Smoke Test Meal")');
await page.click('button:has-text("Remove")');
await page.click('div[role="dialog"] button:has-text("Remove")');
check("remove option", await toast("Option removed"));
check("option gone", q(`select count(*) from "MenuOption" where title='Smoke Test Meal'`) === "0");
await page.click('button:has-text("Restock")');
check("restock", await toast("Restocked"));
await page.getByRole("button", { name: "Archive", exact: true }).first().click();
check("archive saved meal", await toast("Meal archived"));
await page.click("text=Show archived");
await page.click('button:has-text("Restore") >> nth=0');
check("restore archived meal", await toast("Meal restored"));
await page.fill("#lunch-cutoff", "12:30");
await page.click('button:has-text("Save cutoffs for all")');
check("save cutoffs", await toast("Cutoffs saved"));
check("cutoff persisted for all", q(`select count(distinct "lunchCutoff")||'|'||min("lunchCutoff") from "Office"`) === "1|12:30");
await page.fill("#lunch-cutoff", "13:00");
await page.click('button:has-text("Save cutoffs for all")');
await toast("Cutoffs saved");

// ---------------------------------------------------------------- admin: dashboard day-off
await page.goto(BASE + "/admin");
await page.click('button:has-text("Take day off")');
check("take day off", await toast("Day off is on"));
await page.goto(BASE + "/app");
check("member sees catering off", await page.locator("text=Catering is off").first().isVisible());
await page.goto(BASE + "/admin");
await page.click('button:has-text("Resume catering")');
check("resume catering", await toast("Catering resumed"));

// ---------------------------------------------------------------- admin: team
await page.goto(BASE + "/admin/team");
await page.fill("#loc-name", "Smoke Office");
await page.fill("#loc-address", "Nowhere 1");
await page.click('button:has-text("Create location")');
check("create location", await toast("Location created"));
const loc = page.locator("li", { hasText: "Smoke Office" });
await loc.locator('[role="switch"]').click();
check("deactivate location", await toast("Location deactivated"));
await loc.locator("input.input").fill("11:15");
await loc.locator('button:has-text("Save cutoff")').click();
check("save office cutoff", await toast("Cutoff saved"));
await loc.locator('button:has-text("Add managers")').click();
await page.fill("#mgr-search", "Bayazid");
await page.click('button:has-text("Bayazid Ahmed")');
check("add manager", await toast("is now a manager"));
await page.waitForSelector('div[role="dialog"] button:has-text("Remove")');
await page.click('div[role="dialog"] button:has-text("Remove")');
check("remove manager", await toast("Manager removed"));

// ---------------------------------------------------------------- roles
await loginAs("farhana.akter@hfc.example");
await page.goto(BASE + "/admin");
check("manager can open /admin", page.url().endsWith("/admin"));
const offOptions = await page.locator("#f-office option").allTextContents();
check("manager sees only own office", offOptions.join(",") === "All my locations,Aparajita Hall", offOptions.join(","));
await page.goto(BASE + "/admin/team");
check("manager is redirected away from /admin/team", !page.url().endsWith("/admin/team"));
await loginAs("bayazid.ahmed@hfc.example");
await page.goto(BASE + "/admin");
check("plain member redirected from /admin", page.url().endsWith("/app"), page.url());
await ctx.clearCookies();
await page.goto(BASE + "/app");
check("signed-out /app → landing", new URL(page.url()).pathname === "/");

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
