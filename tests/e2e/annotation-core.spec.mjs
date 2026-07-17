import { expect, test } from "@playwright/test";
import { annotationSummary, chooseAnnotationColor, chooseAnnotationStyle, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

test("selection opens the compact toolbar and applies style and color", async ({ page }) => {
  await selectFixtureText(page);
  const toolbar = page.getByTestId("lm-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(page.getByTestId("lm-style-menu-trigger")).toBeVisible();
  await expect(page.getByTestId("lm-color-menu-trigger")).toBeVisible();
  await chooseAnnotationStyle(page, "wavy");
  await chooseAnnotationColor(page, "violet");
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });
});

test("all line styles and named colors are available", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 8);
  for (const style of ["solid", "dashed", "wavy"]) {
    await chooseAnnotationStyle(page, style);
  }
  for (const color of ["amber", "red", "blue", "cyan", "green", "violet"]) {
    await chooseAnnotationColor(page, color);
    await expect(page.getByTestId(`lm-color-${color}`)).toHaveAttribute("aria-label", /.+/);
  }
});

test("highlight marks use the shared annotation model", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 10);
  await page.getByTestId("lm-mark-highlight").click();
  await chooseAnnotationColor(page, "cyan");
  await expect.poll(() => annotationSummary(page)).toMatchObject({ highlightCount: 1, underlineCount: 0 });
});

test("expanded lesson content remains annotatable", async ({ page }) => {
  await page.getByRole("button", { name: "展开解释" }).click();
  await selectFixtureText(page, "#expanded-text", 0, 12);
  await expect(page.getByTestId("lm-toolbar")).toBeVisible();
  await chooseAnnotationStyle(page, "dashed");
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 1 });
});

test("headings, lists, tables, and code remain annotatable", async ({ page }) => {
  for (const selector of ["#core-concept h2", "#core-concept li", "#core-concept td", "#core-concept code"]) {
    await selectFixtureText(page, selector, 0, 2);
    await expect(page.getByTestId("lm-toolbar")).toBeVisible();
    await chooseAnnotationStyle(page, "solid");
  }
  await expect.poll(() => annotationSummary(page)).toMatchObject({ underlineCount: 4 });
});

test("interactive controls are ignored by the selection controller", async ({ page }) => {
  const selected = await page.evaluate(() => window.__fixture.selectText("#ignoredControl", 0, 4));
  expect(selected).toBeTruthy();
  await expect(page.getByTestId("lm-toolbar")).toBeHidden();
});

test("notes and progress have independent reset boundaries", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("这条笔记必须在重置练习后保留。\n第二段理解。");
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });

  const hit = page.getByTestId("lm-note-hit").first();
  await expect(hit).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("lm-note-popover")).toBeHidden();
  await hit.hover();
  await expect(page.getByTestId("lm-note-popover")).toBeVisible();
  await page.mouse.move(8, 8);
  await expect(page.getByTestId("lm-note-popover")).toBeHidden();
  await hit.click();
  await page.mouse.move(8, 8);
  await expect(page.getByTestId("lm-note-popover")).toBeVisible();
  await expect(page.getByTestId("lm-note-popover")).toHaveAttribute("data-pinned", "true");
  await hit.click();
  await expect(page.getByTestId("lm-note-popover")).toBeHidden();

  await page.getByRole("button", { name: "保存原文、上下文和位置" }).click();
  await expect(page.locator("#recordPill")).toHaveText("100% complete");
  await page.getByRole("button", { name: "重置练习进度" }).click();
  await expect(page.locator("#recordPill")).toHaveText("0% complete");
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });
});

test("the original quiz, accordion, and Review jump still work", async ({ page }) => {
  await page.getByRole("button", { name: "展开解释" }).click();
  await expect(page.locator("#expanded-text")).toBeVisible();
  await page.getByRole("button", { name: "只保存 DOM 路径" }).click();
  await expect(page.locator("#quizExplain")).toBeVisible();
  await page.getByRole("link", { name: "复习 →" }).click();
  await expect(page).toHaveURL(/#core-concept$/);
});
