import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseAnnotationColor, chooseAnnotationStyle, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

test("lesson and notes drawer have no serious or critical axe violations", async ({ page }) => {
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});

test("toolbar supports roving keyboard focus and Escape closes transient UI", async ({ page }) => {
  await selectFixtureText(page);
  const toolbar = page.getByTestId("lm-toolbar");
  await expect(toolbar).toBeVisible();
  await toolbar.press("Tab");
  const first = page.locator(":focus");
  await expect(first).toHaveAttribute("aria-label", /.+/);
  const firstTestId = await first.getAttribute("data-testid");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).not.toHaveAttribute("data-testid", firstTestId || "missing");
  await page.keyboard.press("Escape");
  await expect(toolbar).toBeHidden();
});

test("controls expose names and meet the 44px touch target", async ({ page }) => {
  await selectFixtureText(page);
  for (const style of ["solid", "dashed", "wavy"]) {
    await chooseAnnotationStyle(page, style);
  }
  for (const color of ["amber", "red", "blue", "cyan", "green", "violet"]) {
    await chooseAnnotationColor(page, color);
  }
  for (const id of ["lm-style-solid", "lm-color-amber", "lm-add-note"]) {
    const control = page.getByTestId(id);
    await expect(control).toHaveAttribute("aria-label", /.+/);
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("reduced motion and forced colors preserve usable controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await selectFixtureText(page);
  await expect(page.getByTestId("lm-toolbar")).toBeVisible();
  await chooseAnnotationStyle(page, "wavy");
  await page.getByTestId("lm-notes-toggle").click();
  await expect(page.getByTestId("lm-drawer")).toBeVisible();
});

test("mobile layout uses a bottom sheet without overflowing the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByTestId("lm-notes-toggle");
  await toggle.focus();
  await toggle.click();
  const drawer = page.getByTestId("lm-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute("aria-modal", "true");
  await expect(drawer.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Shift+Tab");
  await expect(drawer.locator(":focus")).toHaveCount(1);
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(845);
  await page.getByTestId("lm-drawer-close").click();
  await expect(toggle).toBeFocused();
});
