import { expect, test } from "@playwright/test";
import { annotationSummary, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

test("localhost IndexedDB restores annotations after reload", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-style-wavy").click();
  await page.getByTestId("lm-color-red").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });
  await expect.poll(() => page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("learnmap-annotations-v1");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const request = open.result.transaction("annotations").objectStore("annotations").getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.length);
    };
  }))).toBe(1);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });
});

test("clearing annotations does not clear the lesson learning record", async ({ page }) => {
  await page.getByRole("button", { name: "保存原文、上下文和位置" }).click();
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-style-solid").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });
  const dialogs = [];
  page.on("dialog", async (dialog) => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.getByTestId("lm-clear-annotations").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 0, noteCount: 0 });
  expect(dialogs).toHaveLength(2);
  expect(dialogs[0]).toMatch(/导出|export/i);
  expect(dialogs[1]).toMatch(/危险|永久|confirm/i);
  await expect(page.locator("#recordPill")).toHaveText("100% complete");
});
