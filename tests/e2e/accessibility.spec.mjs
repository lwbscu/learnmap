import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseAnnotationColor, chooseAnnotationStyle, ensureNotesManagerOpen, openFixture, openToolbarMenu, selectFixtureText } from "../helpers/browser.mjs";

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

test("lesson and notes manager have no serious or critical axe violations", async ({ page }) => {
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
  await expect(page.getByTestId("lm-style-menu-trigger")).toBeVisible();
  await expect(page.getByTestId("lm-color-menu-trigger")).toBeVisible();
  await openToolbarMenu(page, "style");
  await expect(page.getByTestId("lm-style-menu")).toBeVisible();
  await toolbar.press("Tab");
  const first = page.locator(":focus");
  await expect(first).toHaveAttribute("aria-label", /.+/);
  const firstTestId = await first.getAttribute("data-testid");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(":focus")).not.toHaveAttribute("data-testid", firstTestId || "missing");
  await page.keyboard.press("Escape");
  await expect(toolbar).toBeHidden();
});

test("controls expose names and use compact desktop plus 44px mobile targets", async ({ page }) => {
  await selectFixtureText(page);
  for (const style of ["solid", "dashed", "wavy"]) {
    await chooseAnnotationStyle(page, style);
  }
  for (const color of ["amber", "red", "blue", "cyan", "green", "violet"]) {
    await chooseAnnotationColor(page, color);
  }
  for (const id of ["lm-style-menu-trigger", "lm-color-menu-trigger", "lm-add-note"]) {
    const control = page.getByTestId(id);
    await expect(control).toHaveAttribute("aria-label", /.+/);
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(32);
    expect(box?.height).toBeGreaterThanOrEqual(32);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await selectFixtureText(page);
  const mobileTarget = await page.getByTestId("lm-add-note").boundingBox();
  expect(mobileTarget?.width).toBeGreaterThanOrEqual(44);
  expect(mobileTarget?.height).toBeGreaterThanOrEqual(44);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("Mobile target note");
  await page.getByTestId("lm-note-save").click();
  const noteHit = page.getByTestId("lm-note-hit").first();
  await expect(noteHit).toHaveAttribute("aria-label", /.+/);
  const noteHitTarget = await noteHit.boundingBox();
  expect(Math.round(noteHitTarget?.width || 0)).toBeGreaterThanOrEqual(44);
  expect(Math.round(noteHitTarget?.height || 0)).toBeGreaterThanOrEqual(44);
});

test("reduced motion and forced colors preserve usable controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await selectFixtureText(page);
  await expect(page.getByTestId("lm-toolbar")).toBeVisible();
  await chooseAnnotationStyle(page, "wavy");
  await page.getByTestId("lm-notes-toggle").click();
  await expect(page.getByTestId("lm-notes-manager")).toBeVisible();
});

test("mobile layout uses a bottom sheet without overflowing the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByTestId("lm-notes-toggle");
  await toggle.focus();
  const manager = await ensureNotesManagerOpen(page);
  await expect(manager).toHaveAttribute("aria-modal", "true");
  await expect(manager).toHaveAttribute("data-layout", "bottom-sheet");
  await expect(manager.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Shift+Tab");
  await expect(manager.locator(":focus")).toHaveCount(1);
  const box = await manager.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(845);
  await page.getByTestId("lm-notes-manager-close").click();
  await expect(toggle).toBeFocused();
});

test("mobile note editor keeps every primary action inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  const editor = page.getByTestId("lm-note-editor-popover");
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute("data-layout", "bottom-sheet");
  const controls = [
    "lm-note-format-bold",
    "lm-note-format-italic",
    "lm-note-format-underline",
    "lm-note-format-ordered-list",
    "lm-note-format-unordered-list",
    "lm-note-image-add",
    "lm-note-editor-close",
    "lm-note-delete-editor",
    "lm-note-options-toggle",
    "lm-note-save"
  ];
  for (const testId of controls) {
    const control = page.getByTestId(testId);
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box, testId).not.toBeNull();
    expect(box.x, testId).toBeGreaterThanOrEqual(0);
    expect(box.y, testId).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, testId).toBeLessThanOrEqual(390);
    expect(box.y + box.height, testId).toBeLessThanOrEqual(844);
  }
});

test("desktop layout has no horizontal or vertical UI overflow", async ({ page }) => {
  await selectFixtureText(page);
  await expect(page.getByTestId("lm-toolbar")).toBeVisible();
  const manager = await ensureNotesManagerOpen(page);
  for (const locator of [page.getByTestId("lm-toolbar"), manager]) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1280);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
  }
});
