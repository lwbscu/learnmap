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

async function openNoteOptions(page) {
  const options = page.getByTestId("lm-note-options");
  if (!(await options.isVisible())) await page.getByTestId("lm-note-options-toggle").click();
  await expect(options).toBeVisible();
  return options;
}

async function createStructuredImageNote(page) {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await expect(page.getByTestId("lm-note-editor-popover")).toBeVisible();
  await openNoteOptions(page);

  const editor = page.getByTestId("lm-note-editor");
  await editor.fill([
    "Existing paragraph",
    "",
    "1. First ordered",
    "2. Second ordered",
    "",
    "- Alpha bullet",
    "- Beta bullet"
  ].join("\n"));
  await page.getByTestId("lm-image-input").setInputFiles({ name: "structured.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, imageCount: 1 });
}

async function expectStructuredImageNote(container, paragraphText) {
  await expect(container.locator('p[data-block-type="paragraph"]').filter({ hasText: paragraphText })).toHaveCount(1);
  const ordered = container.locator('ol[data-block-type="ordered-list"]');
  const unordered = container.locator('ul[data-block-type="unordered-list"]');
  await expect(ordered.locator("li")).toHaveText(["First ordered", "Second ordered"]);
  await expect(unordered.locator("li")).toHaveText(["Alpha bullet", "Beta bullet"]);
  await expectListStyle(ordered, "decimal");
  await expectListStyle(unordered, "disc");
  await expect(container.getByTestId("lm-image-zoom-trigger")).toHaveCount(1);
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

async function expectListStyle(list, expectedType) {
  await expect.poll(() => list.evaluate((element) => getComputedStyle(element).listStyleType)).toBe(expectedType);
}

function rectsOverlap(a, b) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

async function textRangeRects(page, selector, start, end) {
  return page.evaluate(({ selector: target, start: rangeStart, end: rangeEnd }) => {
    const element = document.querySelector(target);
    const node = element?.firstChild;
    if (!node) return [];
    const range = document.createRange();
    range.setStart(node, rangeStart);
    range.setEnd(node, Math.min(rangeEnd, node.textContent.length));
    return Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
  }, { selector, start, end });
}

async function makeNoGutterTextBlock(page) {
  await page.locator("#selection-text").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    element.textContent = "Full-width lesson text with an attached note marker. ".repeat(40);
    Object.assign(element.style, {
      display: "block",
      width: `${innerWidth - rect.left}px`,
      maxWidth: "none",
      marginInlineEnd: "0",
      paddingInlineEnd: "0"
    });
  });
}

async function highlightVisibility(page) {
  return page.evaluate(() => {
    const parseAlpha = (value) => {
      const text = `${value || ""}`.trim();
      const hex = text.match(/#([0-9a-f]{8}|[0-9a-f]{6})\b/i);
      if (hex) return hex[1].length === 8 ? Number.parseInt(hex[1].slice(6, 8), 16) / 255 : 1;
      const rgb = text.match(/rgba?\(([^)]+)\)/i);
      if (!rgb) return null;
      const parts = rgb[1].split(/\s*,\s*|\s+\/\s+|\s+/).filter(Boolean);
      if (parts.length < 4) return 1;
      const raw = parts[3];
      return raw.endsWith("%") ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw);
    };
    const ruleText = document.getElementById("lm-highlight-rules")?.textContent || "";
    const ruleAlphas = Array.from(ruleText.matchAll(/background-color\s*:\s*([^;}]*)/gi))
      .map((match) => parseAlpha(match[1]))
      .filter((alpha) => Number.isFinite(alpha));
    const customRuleAlpha = parseAlpha(ruleText.match(/background-color\s*:\s*(#33AA99[0-9a-f]{0,2}|rgba?\(51[^;}]*)/i)?.[1]);
    const segment = document.querySelector('.lm-overlay-segment[data-mark-type="highlight"]');
    const segmentStyle = segment ? getComputedStyle(segment) : null;
    const segmentBackgroundAlpha = parseAlpha(segmentStyle?.backgroundColor);
    const segmentOpacity = segmentStyle ? Number.parseFloat(segmentStyle.opacity || "1") : null;
    const customVisible = /#33AA99/i.test(ruleText)
      || /51,\s*170,\s*153/.test(segmentStyle?.backgroundColor || "")
      || /#33AA99/i.test(segment?.style.getPropertyValue("--lm-mark") || "");
    return {
      ruleText,
      ruleAlpha: ruleAlphas.length ? Math.min(...ruleAlphas) : null,
      customRuleAlpha,
      segmentBackground: segmentStyle?.backgroundColor || "",
      segmentBackgroundAlpha,
      segmentOpacity,
      customVisible
    };
  });
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

test("note badge is a rounded square and does not overlap annotated or following text on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await makeNoGutterTextBlock(page);
  await createTextNote(page, "Desktop note badge layout");
  const hit = page.getByTestId("lm-note-hit").first();
  await expect(hit).toBeVisible();
  const hitBox = await hit.boundingBox();
  expect(hitBox).not.toBeNull();
  const hitVisual = await hit.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    const radiusToken = style.borderTopLeftRadius || style.borderRadius;
    const width = Number.parseFloat(style.width);
    const height = Number.parseFloat(style.height);
    const radius = radiusToken.endsWith("%")
      ? Math.min(width, height) * Number.parseFloat(radiusToken) / 100
      : Number.parseFloat(radiusToken);
    return {
      width,
      height,
      radius,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      left: Number.parseFloat(style.left),
      top: Number.parseFloat(style.top)
    };
  });
  expect(Math.abs(hitVisual.width - hitVisual.height)).toBeLessThanOrEqual(2);
  expect.soft(hitVisual.radius).toBeGreaterThanOrEqual(3);
  expect.soft(hitVisual.radius, `expected rounded-square badge, got ${hitVisual.borderRadius}`).toBeLessThan(hitVisual.width * 0.45);
  expect(hitVisual.backgroundColor).not.toMatch(/rgba\([^)]*,\s*0\)/i);

  const visualBox = {
    x: hitBox.x + hitVisual.left,
    y: hitBox.y + hitVisual.top,
    width: hitVisual.width,
    height: hitVisual.height
  };
  const annotatedRects = await textRangeRects(page, "#selection-text", 0, 12);
  const followingRects = await textRangeRects(page, "#selection-text", 12, 2000);
  expect(annotatedRects.length).toBeGreaterThan(0);
  expect(followingRects.length).toBeGreaterThan(0);
  for (const rect of annotatedRects.concat(followingRects)) {
    expect(rectsOverlap(visualBox, rect), `note badge overlaps text rect ${JSON.stringify(rect)}`).toBeLessThanOrEqual(1);
  }
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
  await expect(hit).toHaveAttribute("aria-expanded", "true");
  await expectPinnedPreview(page, true);
  await expect(preview.getByTestId("lm-note-copy")).toBeVisible();
  await hit.click();
  await expect(hit).toHaveAttribute("aria-expanded", "false");
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
  await page.getByTestId("lm-note-options-toggle").click();
  await expect(page.getByTestId("lm-note-options")).toBeVisible();
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

test("highlights stay visible on dark themes and custom mark colors render", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-mark-highlight").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ highlightCount: 1 });
  const defaultVisibility = await highlightVisibility(page);
  const defaultAlpha = defaultVisibility.ruleAlpha ?? Math.min(defaultVisibility.segmentBackgroundAlpha ?? 1, defaultVisibility.segmentOpacity ?? 1);
  expect.soft(defaultAlpha, JSON.stringify(defaultVisibility)).toBeGreaterThanOrEqual(0.35);

  await selectFixtureText(page, "#selection-text", 13, 24);
  await page.getByTestId("lm-mark-highlight").click();
  await page.getByTestId("lm-color-menu-trigger").click();
  await page.getByTestId("lm-custom-color").evaluate((input) => {
    input.value = "#33AA99";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => annotationSummary(page)).toMatchObject({ highlightCount: 2 });
  const customVisibility = await highlightVisibility(page);
  const customAlpha = customVisibility.customRuleAlpha ?? Math.min(customVisibility.segmentBackgroundAlpha ?? 1, customVisibility.segmentOpacity ?? 1);
  expect.soft(customAlpha, JSON.stringify(customVisibility)).toBeGreaterThanOrEqual(0.35);
  expect(customVisibility.customVisible, JSON.stringify(customVisibility)).toBe(true);
});

test("legacy v1 data and package imports normalize into runtime v2 notes", async ({ page }) => {
  const legacy = {
    schema: "learnmap-annotations/v1",
    version: 1,
    lesson: { courseId: "course-annotation-fixture", lessonId: "lesson-annotation-fixture", contentVersion: "fixture-v1" },
    annotations: [{
      id: "ann-legacy",
      scopeId: "core-concept",
      anchor: { scopeId: "core-concept", start: 0, end: 6, exact: "学习批注应当" },
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
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, orphanedCount: 0 });
  await expect(page.locator(".lm-note-hit")).toHaveCount(1);
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText("Legacy v1 note");
});

test("legacy prefixed list blocks render clean list content with semantic markers", async ({ page }) => {
  const legacy = {
    schema: "learnmap-annotations/v1",
    version: 1,
    lesson: { courseId: "course-annotation-fixture", lessonId: "lesson-annotation-fixture", contentVersion: "fixture-v1" },
    annotations: [{
      id: "ann-legacy-lists",
      scopeId: "core-concept",
      anchor: { scopeId: "core-concept", start: 0, end: 6, exact: "学习批注应当" },
      style: "solid",
      color: "amber",
      surface: "#FFFFFF",
      noteId: "note-legacy-lists",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    notes: [{
      id: "note-legacy-lists",
      annotationId: "ann-legacy-lists",
      text: "",
      blocks: [
        { type: "ordered-list", text: "1. Legacy first\n1) Legacy second" },
        { type: "unordered-list", text: "- Legacy alpha\n• Legacy beta\nunordered-list: Legacy gamma" }
      ],
      assetIds: [],
      surface: "#FFFFFF",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }],
    assets: []
  };
  await page.evaluate(async (value) => {
    await window.LearnMapAnnotations.importPackage(new File([JSON.stringify(value)], "legacy-list-prefixes.json", { type: "application/json" }));
  }, legacy);
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, orphanedCount: 0 });

  await ensureNotesManagerOpen(page);
  const card = page.getByTestId("lm-note-card").first();
  await expect(card).not.toContainText("unordered-list:");
  const managerOrdered = card.locator('ol[data-block-type="ordered-list"]');
  const managerUnordered = card.locator('ul[data-block-type="unordered-list"]');
  await expect(managerOrdered.locator("li")).toHaveText(["Legacy first", "Legacy second"]);
  await expect(managerUnordered.locator("li")).toHaveText(["Legacy alpha", "Legacy beta", "Legacy gamma"]);
  await expectListStyle(managerOrdered, "decimal");
  await expectListStyle(managerUnordered, "disc");

  await page.getByTestId("lm-notes-manager-close").click();
  await page.getByTestId("lm-note-hit").first().click();
  const preview = page.getByTestId("lm-note-popover");
  await expect(preview).toBeVisible();
  await expect(preview).not.toContainText("unordered-list:");
  const previewOrdered = preview.locator('ol[data-block-type="ordered-list"]');
  const previewUnordered = preview.locator('ul[data-block-type="unordered-list"]');
  await expect(previewOrdered.locator("li")).toHaveText(["Legacy first", "Legacy second"]);
  await expect(previewUnordered.locator("li")).toHaveText(["Legacy alpha", "Legacy beta", "Legacy gamma"]);
  await expectListStyle(previewOrdered, "decimal");
  await expectListStyle(previewUnordered, "disc");
});

test("editing a saved structured image note preserves semantic blocks across reload and package round trip", async ({ page }) => {
  await createStructuredImageNote(page);
  await ensureNotesManagerOpen(page);
  const card = page.getByTestId("lm-note-card").first();
  await expectStructuredImageNote(card, "Existing paragraph");

  await page.getByTestId("lm-note-edit").first().click();
  const editor = page.getByTestId("lm-note-editor");
  const hydratedDraft = [
    "Existing paragraph",
    "",
    "1. First ordered",
    "2. Second ordered",
    "",
    "- Alpha bullet",
    "- Beta bullet"
  ].join("\n");
  await expect(editor).toHaveValue(hydratedDraft);
  await editor.fill(hydratedDraft.replace("Existing paragraph", "Edited paragraph"));
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, imageCount: 1 });

  await ensureNotesManagerOpen(page);
  await expectStructuredImageNote(page.getByTestId("lm-note-card").first(), "Edited paragraph");
  await page.getByTestId("lm-notes-manager-close").click();
  await page.getByTestId("lm-note-hit").first().click();
  const preview = page.getByTestId("lm-note-popover");
  await expect(preview).toBeVisible();
  await expectStructuredImageNote(preview, "Edited paragraph");

  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  await ensureNotesManagerOpen(page);
  await expectStructuredImageNote(page.getByTestId("lm-note-card").first(), "Edited paragraph");

  const downloadEvent = page.waitForEvent("download");
  await page.getByTestId("lm-export-package").click();
  const packageBytes = await fs.readFile(await (await downloadEvent).path());
  await clearPersistentNotes(page);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!window.LearnMapAnnotations)).toBe(true);
  await page.evaluate(async (value) => {
    await window.LearnMapAnnotations.importPackage(new File([new Uint8Array(value)], "structured-round-trip.learnmap"));
  }, Array.from(packageBytes));
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, imageCount: 1 });
  await ensureNotesManagerOpen(page);
  await expectStructuredImageNote(page.getByTestId("lm-note-card").first(), "Edited paragraph");
  await page.getByTestId("lm-notes-manager-close").click();
  await page.getByTestId("lm-note-hit").first().click();
  await expectStructuredImageNote(page.getByTestId("lm-note-popover"), "Edited paragraph");
});

test("moving the caret in a saved note does not create a false dirty draft", async ({ page }) => {
  await createStructuredImageNote(page);
  await ensureNotesManagerOpen(page);
  await page.getByTestId("lm-note-edit").first().click();
  const editor = page.getByTestId("lm-note-editor");
  await editor.evaluate((element) => {
    const start = element.value.indexOf("First ordered");
    element.focus();
    element.setSelectionRange(start, start);
    element.dispatchEvent(new Event("select", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.evaluate(() => {
    window.__lmConfirmCalls = 0;
    window.confirm = () => {
      window.__lmConfirmCalls += 1;
      return true;
    };
  });
  await page.getByTestId("lm-note-editor-close").click();
  await expect(page.getByTestId("lm-note-editor-popover")).toBeHidden();
  expect(await page.evaluate(() => window.__lmConfirmCalls)).toBe(0);
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
  await makeNoGutterTextBlock(page);
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
  const mobileVisual = await page.getByTestId("lm-note-hit").first().evaluate((element) => {
    const hit = element.getBoundingClientRect();
    const style = getComputedStyle(element, "::before");
    return {
      x: hit.x + Number.parseFloat(style.left),
      y: hit.y + Number.parseFloat(style.top),
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height)
    };
  });
  expect(mobileVisual.x).toBeGreaterThanOrEqual(0);
  expect(mobileVisual.x + mobileVisual.width).toBeLessThanOrEqual(390);
  for (const rect of await textRangeRects(page, "#selection-text", 0, 36)) {
    expect(rectsOverlap(mobileVisual, rect), `mobile note badge overlaps text rect ${JSON.stringify(rect)}`).toBeLessThanOrEqual(1);
  }
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
