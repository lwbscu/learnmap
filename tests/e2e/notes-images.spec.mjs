import { expect, test } from "@playwright/test";
import { annotationSummary, ensureNotesManagerOpen, openFixture, selectFixtureText } from "../helpers/browser.mjs";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

async function openNoteOptions(page) {
  const options = page.locator(".lm-note-options");
  if (!(await options.isVisible())) await page.locator(".lm-note-options-toggle").click();
  await expect(options).toBeVisible();
  return options;
}

async function selectEditorText(editor, text) {
  await editor.evaluate((element, selectedText) => {
    const start = element.value.indexOf(selectedText);
    if (start < 0) throw new Error(`Cannot select missing editor text: ${selectedText}`);
    element.focus();
    element.setSelectionRange(start, start + selectedText.length);
  }, text);
}

test.beforeEach(async ({ page }, testInfo) => {
  await openFixture(page, testInfo.project.name);
});

test("a text note is searchable and jumps back to its source", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("锚点恢复是这节课的关键结论。");
  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list")).toContainText("锚点恢复是这节课的关键结论");
  await page.getByTestId("lm-note-list").getByText("锚点恢复是这节课的关键结论").click();
  await expect(page.locator("#selection-text")).toBeInViewport();
});

test("jumping to a note reveals its containing accordion", async ({ page }) => {
  const accordion = page.locator("#expanded-detail");
  await accordion.locator(".accordion-header").click();
  await selectFixtureText(page, "#expanded-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("折叠区笔记");
  await page.getByTestId("lm-note-save").click();
  await accordion.locator(".accordion-header").click();
  await expect(accordion).not.toHaveClass(/open/);
  await ensureNotesManagerOpen(page);
  await page.getByTestId("lm-note-jump").click();
  await expect(accordion).toHaveClass(/open/);
  await expect(page.locator("#expanded-text")).toBeInViewport();
});

test("PNG input is stored as an image note asset", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("包含一张测试图片");
  await page.getByTestId("lm-image-input").setInputFiles({
    name: "note.png",
    mimeType: "image/png",
    buffer: onePixelPng
  });
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, imageCount: 1 });
});

test("compact note editor exposes primary controls and reveals advanced options", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();

  const editor = page.getByTestId("lm-note-editor-popover");
  const addImage = page.getByTestId("lm-note-image-add");
  const imageInput = page.getByTestId("lm-image-input");
  const optionsToggle = page.locator(".lm-note-options-toggle");
  const options = page.locator(".lm-note-options");
  await expect(editor).toBeVisible();
  await expect(page.getByTestId("lm-note-editor")).toBeVisible();
  await expect(addImage).toBeVisible();
  await expect(optionsToggle).toBeVisible();
  await expect(page.getByTestId("lm-note-save")).toBeVisible();
  await expect(page.getByTestId("lm-note-editor-close")).toBeVisible();
  await expect(imageInput).toBeHidden();
  await expect(options).toBeHidden();

  const chooserPromise = page.waitForEvent("filechooser");
  await addImage.click();
  const chooser = await chooserPromise;
  expect(await chooser.element().getAttribute("data-testid")).toBe("lm-image-input");

  await optionsToggle.click();
  await expect(optionsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(options).toBeVisible();
  await expect(page.getByTestId("lm-block-type")).toBeVisible();
  await expect(page.getByTestId("lm-add-block")).toBeVisible();
  await expect(page.getByTestId("lm-note-question")).toBeVisible();
  await expect(page.getByTestId("lm-note-surface-custom")).toBeVisible();
  await expect(page.getByTestId("lm-image-alt")).toBeVisible();
  await expect(page.getByTestId("lm-image-decorative")).toBeVisible();
});

test("editor paste accepts PNG files without intercepting plain text", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  const editor = page.getByTestId("lm-note-editor");

  const textPaste = await editor.evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "纯文本粘贴");
    const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData });
    const dispatched = element.dispatchEvent(event);
    return { defaultPrevented: event.defaultPrevented, dispatched };
  });
  expect(textPaste).toEqual({ defaultPrevented: false, dispatched: true });

  const imagePastePrevented = await editor.evaluate((element, bytes) => {
    const file = new File([new Uint8Array(bytes)], "粘贴图片.png", { type: "image/png" });
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { files: [file], items: [] },
      configurable: true
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  }, [...onePixelPng]);
  expect(imagePastePrevented).toBe(true);
  await expect(page.locator(".lm-note-images img")).toHaveCount(1);

  await editor.fill("粘贴图片笔记");
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 1, imageCount: 1 });
});

test("formatting toolbar transforms selections and renders inline styles and lists", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  const editor = page.getByTestId("lm-note-editor");
  await openNoteOptions(page);
  const blockType = page.getByTestId("lm-block-type");
  const addBlock = page.getByTestId("lm-add-block");
  const inlineCases = [
    ["粗体文本", "lm-note-format-bold"],
    ["斜体文本", "lm-note-format-italic"],
    ["下划线文本", "lm-note-format-underline"]
  ];
  await editor.fill(inlineCases.map(([text]) => text).join(" "));

  for (const [text, testId] of inlineCases) {
    const button = page.getByTestId(testId);
    await expect(button).toBeVisible();
    await selectEditorText(editor, text);
    const before = await editor.inputValue();
    await button.click();
    expect(await editor.inputValue()).not.toBe(before);
    await expect(editor).toHaveValue(new RegExp(text));
  }
  await blockType.selectOption("paragraph");
  await addBlock.click();

  const listCases = [
    ["第一项\n第二项", "lm-note-format-ordered-list", "ordered-list"],
    ["甲项\n乙项", "lm-note-format-unordered-list", "unordered-list"]
  ];
  for (const [text, testId, type] of listCases) {
    await editor.fill(text);
    await selectEditorText(editor, text);
    const before = await editor.inputValue();
    await page.getByTestId(testId).click();
    expect(await editor.inputValue()).not.toBe(before);
    await expect(editor).toHaveValue(new RegExp(text.replace("\n", "[\\s\\S]*")));
    await expect(blockType).toHaveValue(type);
    await addBlock.click();
  }

  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);
  const card = page.locator(".lm-note-card");
  await expect(card.locator("strong")).toHaveText("粗体文本");
  await expect(card.locator("em")).toHaveText("斜体文本");
  await expect(card.locator("u")).toHaveText("下划线文本");
  await expect(card.locator("ol > li")).toHaveText(["第一项", "第二项"]);
  await expect(card.locator("ul > li")).toHaveText(["甲项", "乙项"]);
});

test("canceling an unsaved image removes the pending asset from memory and IndexedDB", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-image-input").setInputFiles({ name: "cancel.png", mimeType: "image/png", buffer: onePixelPng });
  await expect(page.locator(".lm-note-images img")).toHaveCount(1);
  await page.getByTestId("lm-note-cancel").click();
  await page.waitForTimeout(500);
  await expect.poll(() => annotationSummary(page)).toMatchObject({ noteCount: 0, imageCount: 0 });
  const assetCount = await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("learnmap-annotations-v1");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const request = open.result.transaction("assets").objectStore("assets").getAll();
      request.onsuccess = () => resolve(request.result.length);
      request.onerror = () => reject(request.error);
    };
  }));
  expect(assetCount).toBe(0);
});

test("structured note blocks render safely with explicit metadata and actions", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await openNoteOptions(page);
  const blocks = [
    ["heading", "核心结论"],
    ["paragraph", "**加粗**、*斜体*、`code` 与 [官网](https://example.com)"],
    ["ordered-list", "第一项\n第二项"],
    ["unordered-list", "甲\n乙"],
    ["checklist", "[x] 已完成\n[ ] 待处理"],
    ["quote", "安全引用"],
    ["code", "<img src=x onerror=alert(1)>"],
  ];
  for (const [type, value] of blocks) {
    await page.getByTestId("lm-block-type").selectOption(type);
    await page.getByTestId("lm-note-editor").fill(value);
    await page.getByTestId("lm-add-block").click();
  }
  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);
  const card = page.locator(".lm-note-card");
  for (const [type] of blocks) await expect(card.locator(`[data-block-type="${type}"]`)).toHaveCount(1);
  await expect(card.locator("strong")).toHaveText("加粗");
  await expect(card.locator("em")).toHaveText("斜体");
  await expect(card.locator('a[href="https://example.com"]')).toHaveAttribute("rel", /noopener/);
  await expect(card.locator("script, img:not([data-block-type=image])")).toHaveCount(0);
  await expect(card.locator(".lm-note-meta")).toContainText(/amber.*solid/i);
  await expect(page.getByTestId("lm-note-jump")).toBeVisible();
  await expect(page.getByTestId("lm-note-edit")).toBeVisible();
  await expect(page.getByTestId("lm-note-delete")).toBeVisible();
});

test("JPEG and WebP signatures are accepted and image alt text is controlled", async ({ page }) => {
  const images = await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 8; canvas.height = 8;
    canvas.getContext("2d").fillRect(0, 0, 8, 8);
    const encode = (type) => new Promise((resolve) => canvas.toBlob(async (blob) => resolve(Array.from(new Uint8Array(await blob.arrayBuffer()))), type, .8));
    return { jpeg: await encode("image/jpeg"), webp: await encode("image/webp") };
  });
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await openNoteOptions(page);
  await page.getByTestId("lm-note-editor").fill("两种图片格式");
  await page.getByTestId("lm-image-alt").fill("结构示意图");
  await page.getByTestId("lm-image-input").setInputFiles([
    { name: "note.jpg", mimeType: "image/jpeg", buffer: Buffer.from(images.jpeg) },
    { name: "note.webp", mimeType: "image/webp", buffer: Buffer.from(images.webp) }
  ]);
  await page.getByTestId("lm-note-save").click();
  await expect.poll(() => annotationSummary(page)).toMatchObject({ imageCount: 2 });
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list").locator("img")).toHaveCount(2);
  await expect(page.getByTestId("lm-note-list").locator("img").first()).toHaveAttribute("alt", "结构示意图");
});

test("decorative images retain an empty alt attribute", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await openNoteOptions(page);
  await page.getByTestId("lm-note-editor").fill("装饰图片");
  await page.getByTestId("lm-image-decorative").check();
  await page.getByTestId("lm-image-input").setInputFiles({ name: "decorative.png", mimeType: "image/png", buffer: onePixelPng });
  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);
  await expect(page.getByTestId("lm-note-list").locator("img")).toHaveAttribute("alt", "");
});

test("oversized files and decoded images above 12 MP are rejected", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  const oversized = Buffer.alloc(5 * 1024 * 1024 + 1); onePixelPng.copy(oversized);
  await page.getByTestId("lm-image-input").setInputFiles({ name: "too-large.png", mimeType: "image/png", buffer: oversized });
  await expect(page.getByTestId("lm-status")).toContainText(/5 MiB|不得超过/);
  const huge = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.createElement("canvas"); canvas.width = 4096; canvas.height = 3073;
    canvas.toBlob(async (blob) => resolve(Array.from(new Uint8Array(await blob.arrayBuffer()))), "image/png");
  }));
  await page.getByTestId("lm-image-input").setInputFiles({ name: "too-many-pixels.png", mimeType: "image/png", buffer: Buffer.from(huge) });
  await expect(page.getByTestId("lm-status")).toContainText(/12 MP|像素/);
});

test("images longer than 1920px are re-encoded to the edge limit", async ({ page }) => {
  const large = await page.evaluate(() => new Promise((resolve) => {
    const canvas = document.createElement("canvas"); canvas.width = 2500; canvas.height = 1000;
    canvas.getContext("2d").fillRect(0, 0, 2500, 1000);
    canvas.toBlob(async (blob) => resolve(Array.from(new Uint8Array(await blob.arrayBuffer()))), "image/png");
  }));
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("需要缩放的图片");
  await page.getByTestId("lm-image-input").setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: Buffer.from(large) });
  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);
  await expect.poll(() => page.getByTestId("lm-note-list").locator("img").evaluate((img) => img.naturalWidth)).toBe(1920);
});

test("LearnMap package and Markdown exports are downloadable", async ({ page }) => {
  await selectFixtureText(page, "#selection-text", 0, 12);
  await page.getByTestId("lm-add-note").click();
  await page.getByTestId("lm-note-editor").fill("可携带导出的学习笔记");
  await page.getByTestId("lm-note-save").click();
  await ensureNotesManagerOpen(page);

  const packageDownload = page.waitForEvent("download");
  await page.getByTestId("lm-export-package").click();
  expect((await packageDownload).suggestedFilename()).toMatch(/\.learnmap$/i);

  const markdownDownload = page.waitForEvent("download");
  await page.getByTestId("lm-export-markdown").click();
  expect((await markdownDownload).suggestedFilename()).toMatch(/\.md$/i);
});
