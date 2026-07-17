import { expect, test } from "@playwright/test";
import { openFixture, selectFixtureText } from "../helpers/browser.mjs";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function mockQuota(page, ratio) {
  await page.addInitScript((value) => {
    const storage = { estimate: async () => ({ usage: value * 1000, quota: 1000 }) };
    try { Object.defineProperty(navigator, "storage", { configurable: true, value: storage }); } catch (_) {}
  }, ratio);
}

test("70 percent quota warns after persistence", async ({ page }, testInfo) => {
  await mockQuota(page, .75); await openFixture(page, testInfo.project.name);
  await selectFixtureText(page); await page.getByTestId("lm-style-solid").click();
  await expect(page.getByTestId("lm-status")).toContainText(/70%|空间/);
});

test("85 percent quota blocks images but leaves text notes usable", async ({ page }, testInfo) => {
  await mockQuota(page, .9); await openFixture(page, testInfo.project.name);
  await selectFixtureText(page); await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("即使图片被阻止，文字仍能保存");
  await page.getByTestId("lm-image-input").setInputFiles({ name: "blocked.png", mimeType: "image/png", buffer: png });
  await expect(page.getByTestId("lm-status")).toContainText(/85%|删除或导出/);
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations.getSummary())).toMatchObject({ noteCount: 1, imageCount: 0 });
});
