import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { annotationSummary, ensureNotesManagerOpen, openFixture, selectFixtureText } from "../helpers/browser.mjs";
import { learnMapPackage } from "../helpers/learnmap-package.mjs";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

async function createTextNote(page, text = "Runtime v2 note") {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await expect(page.getByTestId("lm-note-editor-popover")).toBeVisible();
  await page.getByTestId("lm-note-editor").fill(text);
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });
}

async function createImageNote(page, text = "Runtime v2 image note") {
  await selectFixtureText(page, "#selection-text", 13, 24);
  await page.getByTestId("lm-add-note").click();
  await expect(page.getByTestId("lm-note-editor-popover")).toBeVisible();
  await page.getByTestId("lm-note-editor").fill(text);
  await page.getByTestId("lm-image-input").setInputFiles({ name: "copy.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ imageCount: 1 });
}

async function clearPersistentNotes(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    localStorage.clear();
    const deleteRequest = indexedDB.deleteDatabase("learnmap-annotations-v1");
    deleteRequest.onsuccess = () => resolve();
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onblocked = () => resolve();
  }));
}

async function installClipboardMock(page, options = {}) {
  await page.evaluate(({ writeFails, writeTextFails, clipboardItemFails }) => {
    window.__lmClipboard = { text: [], writes: 0, items: [] };
    class MockClipboardItem {
      constructor(items) {
        if (clipboardItemFails) throw new Error("ClipboardItem unavailable");
        window.__lmClipboard.items.push(Object.keys(items));
        this.items = items;
      }
    }
    Object.defineProperty(window, "ClipboardItem", { configurable: true, value: MockClipboardItem });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          if (writeTextFails) throw new Error("text clipboard unavailable");
          window.__lmClipboard.text.push(text);
        },
        write: async (items) => {
          window.__lmClipboard.writes += 1;
          if (writeFails) throw new Error("image clipboard unavailable");
          window.__lmClipboard.lastWriteLength = items.length;
        }
      }
    });
  }, options);
}

async function expectPinnedPreview(page, pinned) {
  const preview = page.getByTestId("lm-note-popover");
  if (pinned) {
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-pinned", "true");
  } else {
    await expect(preview).toBeHidden();
  }
}

test("runtime v2 uses floating manager and editor popover selectors without legacy panel", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await expect(page.getByTestId("lm-toolbar")).toBeVisible();
  await page.getByTestId("lm-add-note").click();
  await expect(page.getByTestId("lm-note-editor-popover")).toBeVisible();
  const editorBox = await page.getByTestId("lm-note-editor-popover").boundingBox();
  expect(editorBox).not.toBeNull();
  expect(editorBox.x).toBeGreaterThanOrEqual(8);
  expect(editorBox.x + editorBox.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await expect(page.getByTestId("lm-notes-manager")).toBeHidden();
  await page.getByTestId("lm-note-cancel").click();
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-editor-popover")).toBeHidden();
});

test("note hit icon exists and click, Enter, and Space toggle the pinned preview", async ({ page }) => {
  await createTextNote(page, "Pinned preview text");
  const hit = page.getByTestId("lm-note-hit").first();
  const preview = page.getByTestId("lm-note-popover");
  await expect(hit).toBeVisible();
  await expect(hit).toHaveAttribute("aria-label", /.+/);
  const hitBox = await hit.boundingBox();
  expect(hitBox).not.toBeNull();
  expect(hitBox.width).toBeLessThanOrEqual(32);
  expect(hitBox.height).toBeLessThanOrEqual(32);
  await hit.hover();
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-pinned", "false");
  await page.mouse.move(8, 8);
  await expect(preview).toBeHidden();
  await hit.click();
  await expectPinnedPreview(page, true);
  await expect(preview.getByTestId("lm-note-copy")).toBeVisible();
  await hit.click();
  await expectPinnedPreview(page, false);
  await hit.focus();
  await hit.press("Enter");
  await expectPinnedPreview(page, true);
  await hit.press("Enter");
  await expectPinnedPreview(page, false);
  await hit.press("Space");
  await expectPinnedPreview(page, true);
  await hit.press("Space");
  await expectPinnedPreview(page, false);
});

test("switching between note hits leaves only the active icon expanded", async ({ page }) => {
  await createTextNote(page, "First pinned note");
  await selectFixtureText(page, "#selection-text", 13, 24);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("Second pinned note");
  await page.getByTestId("lm-note-save").click();
  const hits = page.getByTestId("lm-note-hit");
  await expect(hits).toHaveCount(2);
  await hits.nth(0).click();
  await expect(hits.nth(0)).toHaveAttribute("aria-expanded", "true");
  await hits.nth(1).click();
  await expect(hits.nth(0)).toHaveAttribute("aria-expanded", "false");
  await expect(hits.nth(1)).toHaveAttribute("aria-expanded", "true");
});

test("note copy uses ClipboardItem when image clipboard writes succeed", async ({ page }) => {
  await installClipboardMock(page);
  await createImageNote(page, "ClipboardItem image note");
  await ensureNotesManagerOpen(page);
  await page.getByTestId("lm-note-copy").first().click();
  await expect.poll(() => page.evaluate(() => window.__lmClipboard.writes)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__lmClipboard.items.flat())).toContain("image/png");
  await expect(page.getByTestId("lm-status")).toContainText(/copied|clipboard|已复制|复制成功/i);
});

test("note copy falls back to text when image clipboard is unavailable", async ({ page }) => {
  await installClipboardMock(page, { writeFails: true });
  await createImageNote(page, "Image copy fallback");
  await ensureNotesManagerOpen(page);
  await page.getByTestId("lm-note-copy").first().click();
  await expect.poll(() => page.evaluate(() => window.__lmClipboard.writes)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__lmClipboard.text.join("\n"))).toContain("Image copy fallback");
  await expect(page.getByTestId("lm-status")).toContainText(/fallback|text|unsupported|无法复制图片|已复制文字/i);
});

test("note copy reports an error when both image and text clipboard writes fail", async ({ page }) => {
  await installClipboardMock(page, { writeFails: true, writeTextFails: true, clipboardItemFails: true });
  await createImageNote(page, "Uncopyable image note");
  await ensureNotesManagerOpen(page);
  await page.getByTestId("lm-note-copy").first().click();
  await expect(page.getByTestId("lm-status")).toContainText(/failed|error|denied|失败|无法复制/i);
});

test("note surface defaults to #FFFFFF and persists preset and custom #RRGGBB values", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  const editor = page.getByTestId("lm-note-editor-popover");
  await expect(editor).toBeVisible();
  const surface = page.getByTestId("lm-note-surface-custom");
  await expect(surface).toHaveValue("#ffffff");
  await page.getByTestId("lm-note-surface-preset-yellow").click();
  await expect(surface).toHaveValue(/^#[0-9a-f]{6}$/i);
  await surface.fill("#12AB34");
  await page.getByTestId("lm-note-surface-custom-apply").click();
  await page.getByTestId("lm-note-editor").fill("Custom surface note");
  await page.getByTestId("lm-note-save").click();
  await expect(page.getByTestId("lm-status")).toContainText(/saved locally/i);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  await ensureNotesManagerOpen(page);
  const card = page.getByTestId("lm-note-card").first();
  await expect(card).toHaveAttribute("data-surface", "#12AB34");
});

test("legacy v1 data and package imports normalize into runtime v2 notes", async ({ page }) => {
  const legacy = {
    schema: "learnmap-annotations/v1",
    version: 1,
    lesson: { courseId: "course-annotation-fixture", lessonId: "lesson-annotation-fixture", contentVersion: "fixture-v1" },
    annotations: [{
      id: "ann-legacy",
      scopeId: "core-concept",
      anchor: { scopeId: "core-concept", start: 0, end: 6, exact: "瀛︿範鎵规" },
      style: "dashed",
      color: "#3366FF",
      surface: "#FFFFFF",
      noteId: "note-legacy",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    notes: [{
      id: "note-legacy",
      annotationId: "ann-legacy",
      text: "Legacy v1 note",
      blocks: [{ type: "paragraph", text: "Legacy v1 note" }],
      assetIds: [],
      surface: "#FFFFFF",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    assets: []
  };
  const imported = await page.evaluate(async (value) => {
    await window.LearnMapAnnotations.importPackage(new File([JSON.stringify(value)], "legacy.json", { type: "application/json" }));
    return window.LearnMapAnnotations.getSummary();
  }, legacy);
  expect(imported.noteCount).toBe(1);
  await clearPersistentNotes(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  const bytes = learnMapPackage(legacy);
  await page.evaluate(async (value) => {
    await window.LearnMapAnnotations.importPackage(new File([new Uint8Array(value)], "legacy.learnmap"));
  }, Array.from(bytes));
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText("Legacy v1 note");
});

test("full .learnmap export can be imported back after storage is cleared", async ({ page }) => {
  await createTextNote(page, "Round trip note");
  await ensureNotesManagerOpen(page);
  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("lm-export-package").click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.learnmap$/i);
  const packageBytes = await fs.readFile(await download.path());
  await clearPersistentNotes(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  await page.evaluate(async (value) => {
    await window.LearnMapAnnotations.importPackage(new File([new Uint8Array(value)], "round-trip.learnmap"));
  }, Array.from(packageBytes));
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1 });
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText("Round trip note");
});

test("mobile toolbar and manager stay inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await selectFixtureText(page, "#selection-text", 0, 12);
  const toolbarBox = await page.getByTestId("lm-toolbar").boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox.x).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(390);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(844);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("Mobile target note");
  await page.getByTestId("lm-note-save").click();
  const hitBox = await page.getByTestId("lm-note-hit").first().boundingBox();
  expect(hitBox).not.toBeNull();
  expect(Math.round(hitBox.width)).toBeGreaterThanOrEqual(44);
  expect(Math.round(hitBox.height)).toBeGreaterThanOrEqual(44);
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-toolbar")).toBeHidden();
  const managerBox = await page.getByTestId("lm-notes-manager").boundingBox();
  await expect(page.getByTestId("lm-notes-manager")).toHaveAttribute("data-layout", "bottom-sheet");
  expect(managerBox).not.toBeNull();
  expect(managerBox.x).toBeGreaterThanOrEqual(0);
  expect(managerBox.y).toBeGreaterThanOrEqual(0);
  expect(managerBox.x + managerBox.width).toBeLessThanOrEqual(390);
  expect(managerBox.y + managerBox.height).toBeLessThanOrEqual(844);
});
