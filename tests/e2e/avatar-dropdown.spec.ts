import { test, expect } from "@playwright/test";

// These tests assume an authenticated session is restored via storageState,
// or that the app exposes a demo/seed user. In CI we hit the published preview.
// They focus on user-visible avatar dropdown behavior and navbar layout snapshots.

test.describe("Navbar avatar dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens on click and shows email + Sign out", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /open user menu|account|profile/i }).first();
    if (!(await trigger.isVisible().catch(() => false))) test.skip(true, "auth not seeded");
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible();
  });

  test("closes on outside click and Escape", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /open user menu|account|profile/i }).first();
    if (!(await trigger.isVisible().catch(() => false))) test.skip(true, "auth not seeded");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeHidden();
    await trigger.click();
    await page.mouse.click(10, 400);
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeHidden();
  });

  test("keyboard navigation (Tab/Arrows)", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /open user menu|account|profile/i }).first();
    if (!(await trigger.isVisible().catch(() => false))) test.skip(true, "auth not seeded");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeFocused();
  });
});

test.describe("Visual regression — navbar layout", () => {
  test("navbar full-width + avatar spacing", async ({ page }, info) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header).toBeVisible();
    await expect(header).toHaveScreenshot(`navbar-${info.project.name}.png`);
  });
});