import { expect, test } from "@playwright/test";
import { annotationSummary, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test("file URL keeps current-page notes across reload or reports an honest fallback", async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-style-solid").click();
  await page.getByTestId("lm-color-blue").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });

  const status = await page.getByTestId("lm-status").innerText();
  if (/临时|temporary|失败|failed/i.test(status)) {
    await expect(page.getByTestId("lm-export-package")).toBeEnabled();
    return;
  }
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
