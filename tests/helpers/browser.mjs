import { expect } from "@playwright/test";
import { fixtureFileUrl, fixtureHttpPath } from "./paths.mjs";

export async function openFixture(page, projectName) {
  await page.goto(projectName.includes("file") ? fixtureFileUrl : fixtureHttpPath);
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
}

export async function selectFixtureText(page, selector = "#selection-text", start = 0, end = 18) {
  return page.evaluate(({ selector, start, end }) => window.__fixture.selectText(selector, start, end), { selector, start, end });
}

export async function annotationSummary(page) {
  return page.evaluate(() => window.LearnMapAnnotations.getSummary());
}

export async function chooseAnnotationStyle(page, style) {
  const active = page.locator('[data-testid^="lm-style-"][aria-pressed="true"]').first();
  await active.focus();
  await active.hover();
  const option = page.getByTestId(`lm-style-${style}`);
  await expect(option).toBeVisible();
  await option.click();
}

export async function chooseAnnotationColor(page, color) {
  const active = page.locator('[data-testid^="lm-color-"][aria-pressed="true"]').first();
  await active.focus();
  await active.hover();
  const option = page.getByTestId(`lm-color-${color}`);
  await expect(option).toBeVisible();
  await option.click();
}

export async function ensureDrawerOpen(page) {
  const drawer = page.getByTestId("lm-drawer");
  if (!(await drawer.isVisible())) await page.getByTestId("lm-notes-toggle").click();
  await expect(drawer).toBeVisible();
  return drawer;
}
