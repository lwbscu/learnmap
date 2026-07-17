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

export async function ensureDrawerOpen(page) {
  const drawer = page.getByTestId("lm-drawer");
  if (!(await drawer.isVisible())) await page.getByTestId("lm-notes-toggle").click();
  await expect(drawer).toBeVisible();
  return drawer;
}
