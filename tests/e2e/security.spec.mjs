import { expect, test } from "@playwright/test";
import { ensureDrawerOpen, openFixture, selectFixtureText } from "../helpers/browser.mjs";

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name), data = Buffer.from(entry.data), flags = entry.flags ?? 0x800;
    const method = entry.method ?? 0, crc = entry.badCrc ? 0 : crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8); central.writeUInt16LE(method, 10); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42); name.copy(central, 46);
    locals.push(local, data); centrals.push(central); offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function packageEntries(overrides = {}) {
  const manifest = JSON.stringify({ schema: "learnmap-annotations/v1", version: 1, courseId: "security", lessonId: "lesson" });
  const notes = JSON.stringify({ schema: "learnmap-annotations/v1", version: 1, courseId: "security", lessonId: "lesson", annotations: [], notes: [], assets: [] });
  return [
    { name: overrides.firstName || "manifest.json", data: manifest, flags: overrides.flags, method: overrides.method, badCrc: overrides.badCrc },
    { name: "notes.json", data: notes },
  ];
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.addInitScript(() => { window.__learnmapXss = 0; });
  await openFixture(page, testInfo.project.name);
});

test("note text is rendered inert and never executed as HTML", async ({ page }) => {
  const payload = '<img src=x onerror="window.__learnmapXss=1"><script>window.__learnmapXss=2<\/script>';
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill(payload);
  await page.getByTestId("lm-note-save").click();
  await ensureDrawerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText(payload);
  expect(await page.evaluate(() => window.__learnmapXss)).toBe(0);
  await expect(page.getByTestId("lm-note-list").locator("img, script")).toHaveCount(0);
});

test("malformed and executable imports are rejected without changing stored notes", async ({ page }) => {
  const malicious = {
    schema: "learnmap-annotations/v1",
    version: 1,
    annotations: [],
    notes: [{ id: "evil", blocks: [{ type: "html", html: "<svg onload=window.__learnmapXss=3>" }] }],
    assets: []
  };
  const result = await page.evaluate(async (value) => {
    const file = new File([JSON.stringify(value)], "malicious.json", { type: "application/json" });
    try {
      await window.LearnMapAnnotations.importPackage(file);
      return { accepted: true };
    } catch (error) {
      return { accepted: false, message: String(error?.message || error) };
    }
  }, malicious);
  expect(result.accepted).toBe(false);
  expect(await page.evaluate(() => window.__learnmapXss)).toBe(0);
  await expect(page.getByTestId("lm-status")).toContainText(/导入失败|拒绝|invalid|failed/i);
});

test("annotation and note actions do not send learner content off origin", async ({ page }) => {
  const external = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!(["127.0.0.1", "localhost"].includes(url.hostname))) external.push(request.url());
  });
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("不得发送到任何外部服务");
  await page.getByTestId("lm-note-save").click();
  await page.waitForTimeout(100);
  expect(external).toEqual([]);
});

test("SVG masquerading as an image is rejected", async ({ page }) => {
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-image-input").setInputFiles({
    name: "attack.png",
    mimeType: "image/png",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
  });
  await expect(page.getByTestId("lm-status")).toContainText(/图片无效|不支持|invalid|unsupported/i);
});

test("malicious ZIP structures are rejected atomically", async ({ page }) => {
  await selectFixtureText(page);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("导入失败后必须保留");
  await page.getByTestId("lm-note-save").click();
  const packages = [
    zipStore(packageEntries({ firstName: "../evil.jsonx" })),
    zipStore(packageEntries({ flags: 0x801 })),
    zipStore(packageEntries({ method: 8 })),
    zipStore(packageEntries({ badCrc: true })),
    zipStore([...packageEntries(), { name: "notes.json", data: "{}" }]),
  ];
  for (const bytes of packages) {
    const result = await page.evaluate(async (value) => {
      try {
        await LearnMapAnnotations.importPackage(new File([new Uint8Array(value)], "attack.learnmap"));
        return true;
      } catch { return false; }
    }, Array.from(bytes));
    expect(result).toBe(false);
    expect(await page.evaluate(() => LearnMapAnnotations.getSummary().noteCount)).toBe(1);
  }
  await ensureDrawerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText("导入失败后必须保留");
});
