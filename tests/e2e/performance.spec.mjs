import { expect, test } from "@playwright/test";
import { chooseAnnotationStyle, openFixture, selectFixtureText } from "../helpers/browser.mjs";

test("500 anchor resolutions stay bounded and do not mutate the source data", async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
  const measurement = await page.evaluate(() => {
    const api = window.LearnMapAnnotations.__test;
    const text = "这是性能测试段落，包含一个需要恢复的关键概念和足够的上下文。";
    const exact = "关键概念";
    const start = text.indexOf(exact);
    const anchors = Array.from({ length: 500 }, (_, index) => api.buildAnchor({
      scopeId: `scope-${index}`,
      text,
      start,
      end: start + exact.length
    }));
    const scopes = anchors.map((_, index) => ({ scopeId: `scope-${index}`, text: `新增。${text}` }));
    const before = performance.now();
    const results = anchors.map((anchor) => api.resolveAnchor(anchor, scopes));
    return {
      duration: performance.now() - before,
      anchored: results.filter((result) => result.status === "anchored").length
    };
  });
  await testInfo.attach("anchor-performance.json", {
    body: Buffer.from(JSON.stringify(measurement, null, 2)),
    contentType: "application/json"
  });
  expect(measurement.anchored).toBe(500);
  expect(measurement.duration).toBeLessThan(5_000);
});

test("creating a visible annotation completes within the interaction budget", async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
  await selectFixtureText(page);
  const started = Date.now();
  await chooseAnnotationStyle(page, "solid");
  await expect.poll(() => page.evaluate(() => window.LearnMapAnnotations.getSummary().underlineCount)).toBe(1);
  const duration = Date.now() - started;
  await testInfo.attach("interaction-performance.json", {
    body: Buffer.from(JSON.stringify({ duration }, null, 2)),
    contentType: "application/json"
  });
  expect(duration).toBeLessThan(1_000);
});
