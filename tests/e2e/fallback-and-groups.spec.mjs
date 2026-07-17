import { expect, test } from "@playwright/test";
import { annotationSummary, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test("geometry fallback preserves style, color, and overlay contract", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    try { Object.defineProperty(CSS, "highlights", { configurable: true, value: null }); } catch (_) {}
    try { Object.defineProperty(window, "Highlight", { configurable: true, value: undefined }); } catch (_) {}
  });
  await openFixture(page, testInfo.project.name);
  const cases = [["solid", "amber"], ["dashed", "cyan"], ["wavy", "violet"]];
  for (let index = 0; index < cases.length; index += 1) {
    const [style, color] = cases[index];
    await selectFixtureText(page, "#selection-text", index * 5, index * 5 + 4);
    await page.getByTestId(`lm-style-${style}`).click();
    await page.getByTestId(`lm-color-${color}`).click();
  }
  const segments = page.locator(".lm-overlay-layer .lm-overlay-segment");
  await expect(segments).toHaveCount(3);
  for (const [style, color] of cases) {
    await expect(page.locator(`.lm-overlay-segment[data-style="${style}"][data-color="${color}"]`)).toHaveCount(1);
  }
  const wavy = page.locator('.lm-overlay-segment[data-style="wavy"]');
  await expect(wavy).toHaveCSS("background-image", /linear-gradient/);
  await expect.poll(() => wavy.evaluate((node) => getComputedStyle(node).getPropertyValue("--lm-mark").trim())).toBe("#7f4bd8");
});

test("a cross-scope note rebinds every orphaned segment as one group", async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
  await page.getByRole("button", { name: "展开解释" }).click();
  await page.evaluate(() => {
    const start = document.querySelector("#selection-text").firstChild;
    const end = document.querySelector("#expanded-text").firstChild;
    const range = document.createRange(); range.setStart(start, 0); range.setEnd(end, 8);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.querySelector("#selection-text").dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 300, clientY: 180 }));
  });
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("跨区块笔记");
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });

  await page.evaluate(() => {
    document.querySelector("#selection-text").firstChild.data = "完全替换后的第一段内容";
    document.querySelector("#expanded-text").firstChild.data = "完全替换后的第二段内容";
    dispatchEvent(new Event("resize"));
  });
  await page.getByTestId("lm-notes-toggle").click();
  await expect(page.getByRole("button", { name: "重新定位" })).toBeVisible();
  await page.getByRole("button", { name: "重新定位" }).click();
  await page.evaluate(() => {
    const start = document.querySelector("#selection-text").firstChild;
    const end = document.querySelector("#expanded-text").firstChild;
    const range = document.createRange(); range.setStart(start, 0); range.setEnd(end, 8);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.querySelector("#selection-text").dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 300, clientY: 180 }));
  });
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, orphanedCount: 0 });
  await page.getByTestId("lm-notes-toggle").click();
  await expect(page.getByTestId("lm-note-list")).toContainText(/第一段.*第二/s);
});
