import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const sb = url && key ? createClient(url, key) : null;

async function gotoProduction(page) {
  await page.goto("/production");
  if (page.url().includes("/auth")) test.skip(true, "auth required");
  await page.waitForSelector('[data-testid="entry-view-btn"]', { timeout: 8_000 }).catch(() => {});
}

test.describe("View popup — tab memory", () => {
  test("remembers last selected tab per entry across reopen", async ({ page }) => {
    await gotoProduction(page);
    const view = page.getByTestId("entry-view-btn").first();
    if (!(await view.isVisible().catch(() => false))) test.skip(true, "no entries seeded");
    await view.click();
    await page.getByTestId("tab-ledger").click();
    await page.keyboard.press("Escape");
    await view.click();
    await expect(page.getByTestId("tab-ledger")).toHaveAttribute("data-state", "active");
  });
});

test.describe("Table/Cards preference persistence", () => {
  test("persists across refresh and across Production ↔ Purchase", async ({ page }) => {
    await gotoProduction(page);
    const cardsBtn = page.getByRole("button", { name: /cards/i });
    if (!(await cardsBtn.isVisible().catch(() => false))) test.skip(true, "list view not present");
    await cardsBtn.click();
    await expect.poll(async () =>
      page.evaluate(() => window.localStorage.getItem("entry-view"))
    ).toBe("grid");
    await page.reload();
    await expect(page.evaluate(() => window.localStorage.getItem("entry-view"))).resolves.toBe("grid");
    await page.goto("/purchase");
    await expect(page.evaluate(() => window.localStorage.getItem("entry-view"))).resolves.toBe("grid");
  });
});

test.describe("View popup — keyboard accessibility", () => {
  test("ArrowRight moves tab focus, Enter activates, Esc closes", async ({ page }) => {
    await gotoProduction(page);
    const view = page.getByTestId("entry-view-btn").first();
    if (!(await view.isVisible().catch(() => false))) test.skip(true, "no entries seeded");
    await view.click();
    await page.getByTestId("tab-details").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("tab-ledger")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("tab-ledger")).toHaveAttribute("data-state", "active");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("entry-view-dialog")).toBeHidden();
  });
});

test.describe("View popup — visual regression", () => {
  for (const tab of ["details", "ledger", "attachments"] as const) {
    test(`tab ${tab} layout snapshot`, async ({ page }, info) => {
      await gotoProduction(page);
      const view = page.getByTestId("entry-view-btn").first();
      if (!(await view.isVisible().catch(() => false))) test.skip(true, "no entries seeded");
      await view.click();
      await page.getByTestId(`tab-${tab}`).click();
      const dialog = page.getByTestId("entry-view-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveScreenshot(`view-popup-${tab}-${info.project.name}.png`);
    });
  }
});

test.describe("Inventory ledger totals match DB sums", () => {
  test("ledger totals === SUM(qty_in/qty_out) for ref_table/ref_id", async ({ page }) => {
    if (!sb) test.skip(true, "supabase env not configured");
    await gotoProduction(page);
    const firstRow = page.locator('[data-testid="entry-view-btn"]').first();
    if (!(await firstRow.isVisible().catch(() => false))) test.skip(true, "no entries seeded");
    const refId = await firstRow.evaluate((el) => el.closest("tr,div[class*='rounded-lg']")?.getAttribute("data-row-id") || "");
    await firstRow.click();
    await page.getByTestId("tab-ledger").click();
    const totals = await page.getByTestId("ledger-totals").evaluate((el) => ({
      tin: Number(el.getAttribute("data-total-in")),
      tout: Number(el.getAttribute("data-total-out")),
      lines: Number(el.getAttribute("data-line-count")),
    })).catch(() => null);
    if (!totals || !refId) test.skip(true, "ledger totals not exposed");
    const { data } = await sb!.from("inventory_transactions")
      .select("qty_in, qty_out")
      .eq("ref_table", "production_entries")
      .eq("ref_id", refId);
    const sumIn = (data ?? []).reduce((s, r: any) => s + Number(r.qty_in || 0), 0);
    const sumOut = (data ?? []).reduce((s, r: any) => s + Number(r.qty_out || 0), 0);
    expect(totals!.tin).toBeCloseTo(sumIn, 4);
    expect(totals!.tout).toBeCloseTo(sumOut, 4);
    expect(totals!.lines).toBe((data ?? []).length);
  });
});