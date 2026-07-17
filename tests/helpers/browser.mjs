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
  await openToolbarMenu(page, "style");
  const option = page.getByTestId(`lm-style-${style}`);
  await expect(option).toBeVisible();
  await option.click();
}

export async function chooseAnnotationColor(page, color) {
  await openToolbarMenu(page, "color");
  const option = page.getByTestId(`lm-color-${color}`);
  await expect(option).toBeVisible();
  await option.click();
}

export async function openToolbarMenu(page, kind) {
  const trigger = page.getByTestId(`lm-${kind}-menu-trigger`);
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.getByTestId(`lm-${kind}-menu`);
  await expect(menu).toBeVisible();
  return menu;
}

export async function ensureNotesManagerOpen(page) {
  const manager = page.getByTestId("lm-notes-manager");
  if (!(await manager.isVisible())) await page.getByTestId("lm-notes-toggle").click();
  await expect(manager).toBeVisible();
  return manager;
}
